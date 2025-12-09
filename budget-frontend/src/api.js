
const API_URL = "https://64.225.4.9:8000"; // backend URL
// const API_URL = "https://localhost:8000"; // backend URL

// contains async api functions for login/logout and CRUD features

export async function loginUser(email, password) {
    try{
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({  "email": email, 
                                    "password": password }),
        });
        if (!res.ok) {
            throw new Error("Failed to login")
        }
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function logoutUser() {
    try{
        const res = await fetch(`${API_URL}/logout`, {
            method: "POST",
            credentials: "include" // for jwt token
        });
        if (!res.ok) {
            throw new Error("Failed to logout")
        }
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function createUser(email, password) {
    try{
        const res = await fetch(`${API_URL}/make-account`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({  "email": email, 
                                    "password": password }),
        });
        if (!res.ok) {
            throw new Error("Failed to create user")
        }
        return true
    } catch (error) {
        console.log("login error")
        console.log(error)
        return false
    }
}

export async function verifyLogin() {
    try{
        const res = await fetch(`${API_URL}/verify`, {
            method: "GET",
            credentials: "include" // for jwt token
        });
        if (!res.ok) {
            throw new Error("Failed to login")
        }
        return true
    } catch (error) {
        console.log("login error")
        console.log(error)
        return false
    }
}

export async function getSummary(month, year) {
    try{
        const res = await fetch(`${API_URL}/get-summary?month=${month}&year=${year}`, {
            method: "GET",
            credentials: "include" // for jwt token
        });
        if (!res.ok) {
            throw new Error("Failed to fetch dashboard");
        }

        return res.json();
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function getDetails(table, category_name, month, year) {
    try{
        const res = await fetch(`${API_URL}/get-details?month=${month}&year=${year}&table=${table}&category=${category_name}`, {
            method: "GET",
            credentials: "include" // for jwt token
        });
        if (!res.ok) {
            throw new Error("Failed to fetch details");
        }
        
        return res.json();
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function createItem(name, amount, type, category_name, month, year){
    try{
        const res = await fetch(`${API_URL}/items?month=${month}&year=${year}&table=${type}`, {
            method: "POST",
            credentials: "include", // for jwt token
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({  
                                    "category_name": category_name,   
                                    "amount": amount,              
                                    "name": name
                                }),
        });
        if (!res.ok) {
            throw new Error("Failed to create row");
        }
        return res.json();
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function updateItem(row_id, name, amount, type, category_name, month, year){
    try{
        const res = await fetch(`${API_URL}/items?month=${month}&year=${year}&table=${type}`, {
            method: "PUT",
            credentials: "include", // for jwt token
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({  
                                    "category_name": category_name,   
                                    "amount": amount,              
                                    "name": name,
                                    "id": row_id,
                                }),
        });
        if (!res.ok) {
            throw new Error("Failed to update row");
        }
        return res.json();
    } catch (error) {
        console.log(error)
        return false
    }
}

export async function deleteItem(row_id, type, month, year){
    try{
        const res = await fetch(`${API_URL}/items?month=${month}&year=${year}&table=${type}`, {
            method: "DELETE",
            credentials: "include", // for jwt token
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({  
                                    "id": row_id,
                                }),
        });
        if (!res.ok) {
            throw new Error("Failed to delete row");
        }
        return res.json();
    } catch (error) {
        console.log(error)
        return false
    }
}