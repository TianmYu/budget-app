from flask import jsonify
import traceback

def check_list_in_dict(source_list, target_dict):
    # checks if entries in source_list are keys in target_dict. returns true if all exist

    output = True
    for item in source_list:
        if not item in target_dict:
            output = False
    return output

# adds items in cat list to the output list if not present
# otherwise sorts the target list by order of cat_list
def add_categories(default_items, target_list):
    out_list_end = []
    out_list_front = []
    for item in default_items:
        present = False
        for target in target_list:
            # if list item in default list, use the list item
            if item == target["category_name"]:
                present = True
                out_list_front += [target]
                break
            # if the list item is not in the default list, add it to end
            if target["category_name"] not in default_items:
                out_list_end += [target]
                break
        if not present:
            out_list_front += [
                {
                    "category_name": item,
                    "total": 0
                }
            ]
            
    out_list = out_list_front + out_list_end
    return out_list

# executes a query using the db pool, handles closing the connection and exceptions
def execute_query(db_pool, query, query_arg_tuple, logger = None, commit = False, fetch = True):
    conn = db_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(query, query_arg_tuple)
            if fetch:
                response = cur.fetchall()
            else:
                response = True

            if commit:
                conn.commit()

            return response
        
    except Exception as e:
        if logger is not None:
            logger.error(e)
        else:
            print(e)
        traceback.print_exc()

        return None

    finally:
        db_pool.putconn(conn)
        