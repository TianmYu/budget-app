from flask import Flask, request, jsonify, make_response, send_from_directory
import jwt
from passlib.hash import bcrypt
from psycopg2 import pool
from flask_cors import CORS

import traceback
import helpers as h

from datetime import datetime, timezone, timedelta
import time
import os

app = Flask(__name__, static_folder="./dist", static_url_path="/")

# CORS(app, supports_credentials=True, origins=[os.environ.get("FRONTEND_HOST", "http://localhost:5173")])

# postgres db client pool
connected = False
while not connected:
    try:
        db_pool = pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            user=os.environ.get("DB_USER", "user"),
            password=os.environ.get("DB_PASSWORD", "password"),
            host=os.environ.get("DB_HOST", "localhost"),
            port=os.environ.get("DB_PORT", 5432),
            dbname=os.environ.get("DB_NAME", "budgetdb")
        )
        connected = True
    except:
        time.sleep(1)
        print("failed to connect to db, retrying")

# Create JWT
def create_jwt(user_id):
    payload = {
        "user": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "iat": datetime.now(timezone.utc)
    }
    app.logger.error(os.environ.get("JWT_KEY"))
    return jwt.encode(payload, os.environ.get("JWT_KEY"), algorithm="HS256")

# provide a login response with jwt token in cookie
def login_response(user_id):
    token = create_jwt(user_id)
    resp = make_response(jsonify({"response": "logged in"}))
    resp.set_cookie(
        "jwt",
        token,
        httponly=True,
        secure=True, # TODO: set true when implementing https
        samesite='None', # samesite='Lax',
        max_age=3600
    )
    return resp

# clear browser jwt token
def logout_response():
    resp = make_response(jsonify({"response": "logged out"}))
    resp.set_cookie(
        "jwt",
        "",
        httponly=True,
        secure=True, 
        samesite='None', # samesite='Lax',
        max_age=0
    )
    return resp

# Middleware to protect routes
def require_jwt(fn):
    def wrapper(*args, **kwargs):
        token = request.cookies.get("jwt")  # get JWT from cookie
        app.logger.error(token)
        if not token:
            return jsonify({"error": "Missing or invalid token"}), 401

        try:
            decoded = jwt.decode(
                token,
                os.environ.get("JWT_KEY"),
                algorithms=["HS256"]
            )
            request.user_id = decoded["user"]  # attach user to request
            # need to process the user if it exists too
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return fn(*args, **kwargs)

    wrapper.__name__ = fn.__name__
    return wrapper

@app.route('/')
def home():
    index_path = os.path.join(app.static_folder, 'index.html')
    app.logger.error("debug")
    app.logger.error(index_path)
    app.logger.error(os.path.exists(index_path))

    return send_from_directory(app.static_folder, 'index.html')
    
@app.route("/login", methods = ['POST'])
def login_handler():
    data = request.get_json()

    email = data["email"]
    password = data["password"]

    # verify password with hashed storage
    query = "SELECT id, password FROM users WHERE email = %s"
    rows = h.execute_query(db_pool, query, (email,), app.logger)

    if rows is None:
        return jsonify({"error": "internal server error"}), 500
    else:
        # user found
        if len(rows) > 0:
            user_id = rows[0][0]
            pass_hash = rows[0][1]

            # if successful verification, provide a jwt session cookie
            if bcrypt.verify(password, pass_hash):
                resp = login_response(user_id)
                return resp
            else:
                return jsonify({"error": "incorrect password"}), 401
            
        # user not found
        else:
            return jsonify({"error": "user not found"}), 401  

@app.route("/logout", methods = ['POST'])
@require_jwt
def logout_handler():
    # just wipe the jwt token
    resp = logout_response()
    return resp

@app.route("/make-account", methods = ['POST'])
def make_account_handler():
    data = request.get_json()
    email = data["email"]
    password = data["password"]

    query = "SELECT * FROM users WHERE email = %s"
    rows = h.execute_query(db_pool, query, (email,), app.logger)

    if rows is None:
        return jsonify({"error": "internal server error"}), 500
    # if user found, notify that user already exists
    elif len(rows) > 0:
        return jsonify({"error": "user already exists"}), 403
        
    # if user doesn't already exist, make user account. TODO: add sendgrid
    else:
        hash = bcrypt.hash(password)
        query = "INSERT INTO users (email, password) VALUES (%s, %s) RETURNING id"
        rows = h.execute_query(db_pool, query, (email, hash), app.logger, commit = True)
        if rows is None:
            return jsonify({"error": "internal server error"}), 500
        else:
            user_id = rows[0][0]
            resp = login_response(user_id)
        return resp

@app.route("/verify", methods = ['GET'])
@require_jwt
def verify_handler():
    # use to check if we have a valid jwt token in browser
    return jsonify({"status": "logged in"}), 200

def get_summary(cur, user_id, table, month, year):
    query = f"SELECT category_name, SUM(amount) FROM {table} WHERE user_id = %s AND month = %s AND year = %s GROUP BY category_name"
    cur.execute(query, (user_id, month, year))
    rows = cur.fetchall()

    output = []
    for row in rows:
        output += [
            {
                "category_name": row[0],
                "total": row[1]
            }
        ]
    return output

@app.route("/get-summary", methods = ['GET'])
@require_jwt
def get_summary_handler():
    default_income_categories = ["income"]
    default_expense_cateogires = ["bills", "groceries", "rent", "misc"]

    # gets summary of income and expenses by category for a user
    user_id = request.user_id

    month = request.args.get('month', default = datetime.now().month, type = int)
    year = request.args.get('year', default = datetime.now().year, type = int)

    conn = db_pool.getconn()
    try:
        with conn.cursor() as cur:
            income_summ = get_summary(cur, user_id, table = "income", month = month, year = year)
            expense_summ = get_summary(cur, user_id, table = "expenses", month = month, year = year)

            income_summ = h.add_categories(default_income_categories, income_summ)
            expense_summ = h.add_categories(default_expense_cateogires, expense_summ)

            app.logger.error("income")
            app.logger.error(income_summ)
            return jsonify({"income": income_summ, "expense": expense_summ}), 200
    except Exception as e:
        app.logger.error(e)
        traceback.print_exc()
        return jsonify({"error": "internal server error"}), 500
    finally:
        db_pool.putconn(conn)

def get_details(cur, user_id, table, category_name, month, year):
    query = f"SELECT id, amount, name FROM {table} WHERE user_id = %s AND category_name = %s AND month = %s AND year = %s ORDER BY id ASC"
    cur.execute(query, (user_id, category_name, month, year)) # make table more safe later
    rows = cur.fetchall()

    output = []
    for row in rows:
        output += [
            {
                "id": row[0],
                "amount": row[1],
                "name": row[2]
            }
        ]
    return output

@app.route("/get-details", methods = ['GET'])
@require_jwt
def get_details_handler():
    # gets detailed list of all entries for a specific category within expenses or income
    user_id = request.user_id

    month = request.args.get('month', default = datetime.now().month, type = int)
    year = request.args.get('year', default = datetime.now().year, type = int)
    table = request.args.get('table', type = str)
    category_name = request.args.get('category', type = str)
    if table not in ["expenses", "income"]:
        return jsonify({"error": "invalid selection"}), 400

    conn = db_pool.getconn()
    try:
        with conn.cursor() as cur:
            details = get_details(cur, user_id, table = table, category_name = category_name, month = month, year = year)

            return jsonify({"details": details}), 200
    except Exception as e:
        app.logger.error(e)
        traceback.print_exc()
        return jsonify({"error": "internal server error"}), 500
    finally:
        db_pool.putconn(conn)

@app.route("/items", methods = ['POST', 'PUT', 'DELETE'])
@require_jwt
def item_handler():
    # manage expense addition, update, or deletion
    # get preliminary info
    month = request.args.get('month', default = datetime.now().month, type = int)
    year = request.args.get('year', default = datetime.now().year, type = int)
    table = request.args.get('table', type = str)
    user_id = request.user_id
    data = request.get_json()

    # we need an id field for delete or update requests
    if request.method == "DELETE" or request.method == "PUT":
        if "id" not in data:
            return jsonify({"error": "missing item id"}), 400
        try:
            row_id = int(data["id"])
        except Exception as e:
            app.logger.error(e)
            traceback.print_exc()
            return jsonify({"error": "invalid id datatype"}), 400

        if table not in ["expenses", "income"]:
            return jsonify({"error": "invalid selection"}), 400
    
    # handle deletion
    if request.method == "DELETE":
        # check all the fields to ensure correct deletion
        query = f"DELETE FROM {table} WHERE month = %s AND year = %s AND user_id = %s AND id = %s"
        rows = h.execute_query(db_pool, query, (month, year, user_id, row_id), app.logger, commit = True, fetch = False)

        if rows is None:
            return jsonify({"error": "internal server error"}), 500
        else:
            return jsonify({"response": "successfully deleted"}), 200

    # handle insertion or update
    elif request.method == "PUT" or request.method == "POST":

        # check that the request has category, amount, and name
        if not h.check_list_in_dict(["category_name", "amount", "name"], data):
            return jsonify({"error": "missing input fields"}), 400
        try:
            category_name, amount, name = str(data["category_name"]), float(data["amount"]), str(data["name"])
        except Exception as e:
            app.logger.error(e)
            traceback.print_exc()
            return jsonify({"error": "invalid input datatype"}), 400
    
        # insertion
        if request.method == "POST":
            query = f"INSERT INTO {table} (user_id, category_name, amount, name, month, year) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id"
            rows = h.execute_query(db_pool, query, (user_id, category_name, amount, name, month, year), app.logger, commit = True)
            if rows is None:
                return jsonify({"error": "error creating entry"}), 500
            else:
                new_id = rows[0][0]
                return jsonify({"id": new_id}), 200

        # update
        if request.method == "PUT":
            query = f"UPDATE {table} SET amount = %s, name = %s WHERE id = %s AND user_id = %s AND month = %s AND year = %s"
            rows = h.execute_query(db_pool, query, (amount, name, row_id, user_id, month, year), app.logger, commit = True, fetch = False)
            if rows is None:
                return jsonify({"error": "error creating entry"}), 500
            else:
                return jsonify({"response": "row updated"}), 200
    

if __name__ == "__main__":
    app.run(host="0.0.0.0", port = 8000, ssl_context = ('cert.pem', 'key.pem')) # for dev only