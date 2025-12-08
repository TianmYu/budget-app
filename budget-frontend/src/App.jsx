import { useState, useEffect} from 'react'

import {loginUser, createUser, verifyLogin, logoutUser, getSummary, getDetails, createItem, updateItem, deleteItem} from './api.js'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BarChart } from '@mui/x-charts/BarChart';

// top level app, implemented as single window applications. handles switching between pages internally
function App() {
  const [currentPage, setCurrPage] = useState(0);

  useEffect(() =>  {
    verifyLogin().then(result => {
      if (result) {
        setCurrPage(2)
      } 
    });
  })

  const login = async (email, password) => {
    const loggedIn = await loginUser(email, password);
    if (loggedIn){
      setCurrPage(2);
    }
    return loggedIn
  };

  const swtichCreate = () => {
    setCurrPage(1);
  }

  const createAccount = async (email, password) => {
    const loggedIn = await createUser(email, password);
    console.log(`loggedin ${loggedIn}`)
    if (loggedIn){
      setCurrPage(2);
    }
  };

  const logout = async () => {
    const loggedOut = await logoutUser();
    if (loggedOut){
      setCurrPage(0);
    }
  };

  const back = () => {
    setCurrPage(0);
  }

  // display each page object based on internal state
  switch (currentPage) {
    case 0:
    return (
      <Login onLogin={login} onSwitchCreate={swtichCreate} />
    )
    case 1:
    return (
      <CreateAccount onCreate={createAccount} onReturn = {back} />
    )
    case 2:
    return (
      <Dashboard onReturn={logout} />
    )    
  }
}

// login page
function Login({ onLogin, onSwitchCreate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginFailed, setLoginFailed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // call backend API to authenticate
    let ret = await onLogin(email, password); // authenticate and set token if valid
    setLoginFailed(!ret)
  };

  const handleClick = () => {
    setLoginFailed(false)
    onSwitchCreate()
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h1>CashTrack</h1>
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
        {
          (loginFailed) && <p> login failed </p>
        }
      </form>

      <button onClick = {()=> handleClick()}> Create Account </button>
    </div>
  );
}

// account creation page
function CreateAccount({ onCreate, onReturn}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // call backend API to authenticate
    onCreate(email, password); // authenicate and set token if valid
  };

  const handleClick = () => {
    onReturn();
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Create Account</button>
      </form>
      <button onClick = {() => handleClick()}>Return</button>
    </div>
  );
}

// main dashboard page
function Dashboard({onReturn }){
  const [incomeSum, setIncomeSum] = useState([]);
  const [expenseSum, setExpenseSum] = useState([]);

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupType, setPopupType] = useState("");
  const [popupCategory, setPopupCategory] = useState("");
  const [popupRows, setRows] = useState([])

  var date = new Date()
  const [month, setMonth] = useState(date.getMonth()) // months are 0-indexed
  const [year, setYear] = useState(date.getFullYear())

  // load summary data for dashboard
  useEffect(() =>  {
    getSummary(month, year).then(result => {
      setIncomeSum(result.income)
      setExpenseSum(result.expense)
      }
    )
  }, [popupRows, month, year, popupOpen])

  const handleClick = () => {
    onReturn();
  };

  // decrement month by 1
  const handleMonthLeft = () => {
    console.log("handling left")
    let newMonth = month - 1
    let newYear = year

    // handle year decrement
    if (newMonth < 0) {
      newYear = year - 1
      newMonth = 11
    }

    setMonth(newMonth)
    setYear(newYear)
  }

  // increment month by 1
  const handleMonthRight = () => {
    console.log("handling right")
    let newMonth = month + 1
    let newYear = year

    // handle year increment
    if (newMonth > 11) {
      newYear = year + 1
      newMonth = 1
    }

    setMonth(newMonth)
    setYear(newYear)
  }

  // opens the popup window
  const handleClickPopup = async (type, category_name) => {
    getDetails(type, category_name, month, year).then(result => {
      setRows([...result.details, { // add extra row as placeholder for "new row"
        id:-1,
        name:"",
        amount:0
      }])
      setPopupOpen(true);
      setPopupType(type)
      setPopupCategory(category_name)
    })
  };

  const closePopup = () => {
    setPopupOpen(false);
  };

  return (
    <div className = "container-fluid">
      <div className = "row">
        <div className = "col-2"></div>
        <div className = "col-8">
          <h2>Dashboard</h2>
          <div className = "row">
          <MonthSelector month = {month} year = {year} handleMonthLeft = {handleMonthLeft} handleMonthRight = {handleMonthRight}/>
          </div>
          <div className = "row">
          <IncomeExpenses data={incomeSum} type = {"income"} handleClick = {handleClickPopup}/>
          </div>
          <div className = "row">
          <IncomeExpenses data={expenseSum} type = {"expenses"} handleClick = {handleClickPopup} displayChart = {true}/>
          </div>
          <div className = "row">
            <div className = "col-5"></div>
            <div className = "col-2">
              <button onClick = {() => handleClick()}>Logout</button>
            </div>
            <div className = "col-5"></div>
          </div>
        </div>
        <div className = "col-2"></div>
      </div>
      <Popup show={popupOpen} type={popupType} category_name={popupCategory} onClose={closePopup} rows={popupRows} setRows = {setRows} month = {month} year = {year}/>
    </div>
  );
}

// small top menu that allows switching between months
function MonthSelector({month, year, handleMonthLeft, handleMonthRight}){
  const monthMap = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleClick = (direction) => {
    if (direction == "left"){
      console.log(" direction left ")
      handleMonthLeft()
    }
    if (direction == "right"){
      console.log(" direction right ")
      handleMonthRight()
    }
  }

  return (
    <div>
      <div className = "row">
      <div className = "col-3"></div>
      <div className = "col-2">
      <button onClick = {()=> handleClick("left")}> Prev </button>
      </div>
      <div className = "col-2">
      {
        `${monthMap[parseInt(month)]}, ${year}`
      }
      </div>
      <div className = "col-2">
      <button onClick = {()=> handleClick("right")}> Next </button>
      </div>
      <div className = "col-3"></div>
      </div>
    </div>
  )
}

// general summary block and bar graph
function IncomeExpenses({data, type, handleClick, displayChart = false}){
  console.log(data)

  let categories = []
  let values = []
  let max_val = 1000
  
  for (let item of data) {
    categories.push(item.category_name)
    values.push(item.total)
    if (Number(item.total) > max_val) {
      max_val = Number(item.total)
    } 
  }

  return (
    <div className="col-12">
      <h4 style={{textAlign: 'left', marginLeft: '10px'}}>{type}</h4>
      <div className = "row">
        <div className = "col-7" style={{paddingRight: "0px"}}>
          {data.map((item) => ( // renders the budget summary cards
          <div
            className={"block"}
            key={item.category_name}
            onClick={() => handleClick(type, item.category_name)}
          >
            <div className="block-value">{item.category_name}</div>
            <div className="block-label">{item.total}</div>
          </div>
          ))}
        </div>
        <div className = "col-5" style={{paddingLeft: "0px"}}>
        {displayChart ? 
          // render the bar graph
          <BarChart
            xAxis={[
              {
                id: 'barCategories',
                data: categories,
                sx: {
                color: '#D7DADC',        // x-axis label color
                '& .MuiChartsAxis-tickLabel': {
                  fill: '#D7DADC',       // x-axis tick color
                  },
                '& .MuiChartsAxis-line': {
                    stroke: '#D7DADC', // **axis line color**
                  },
                  '& .MuiChartsAxis-tick': {
                    stroke: '#D7DADC', // **axis line color**
                  },
                },
              },
            ]}
            yAxis={[
              {
                min: 0,
                max: max_val,
                sx: {
                  color: '#D7DADC',        // x-axis label color
                  '& .MuiChartsAxis-tickLabel': {
                    fill: '#D7DADC',       // x-axis tick color
                    },
                  '& .MuiChartsAxis-line': {
                    stroke: '#D7DADC', // **axis line color**
                  },
                  '& .MuiChartsAxis-tick': {
                    stroke: '#D7DADC', // **axis line color**
                  },
                },
              }
            ]}
            series={[
              {
                data: values,
              },
            ]}
            height={300}
          />
        : null}
        </div> 
      </div>
    </div>
  );
}

// popup window with specific entries
function Popup ({ show, type, category_name, onClose, rows, setRows, month, year}) {
  if (!show) return null; // don't render if not shown

  const onUpdateRow = (row, type, category_name) => {
    updateItem(row.id, row.name, row.amount, type, category_name, month, year)
  }

  const onDeleteRow = (row, type) => {
    const target_id = row.id
    deleteItem(target_id, type, month, year).then(result => {
      if (result){
        setRows(
          rows => rows.filter(row => row.id !== target_id)   
        )
      }
    })
  }

  const onAddRow = (row, type, category_name) => {
    createItem(row.name, row.amount, type, category_name, month, year).then(result => {
      if (result){
        setRows(prevRows => [
          ...prevRows.slice(0, -1),
          {id: result.id, name: row.name, amount: row.amount}, // add newly inserted row to local struct, reset the blank row
          {id:-1, name:"", amount:0}
        ])
      }
    })
  }

  const handleFieldChange = (id, field, value) => {
    const updated = rows.map(row => {
      return row.id === id ? {...row, [field]:value} : row
    })
    setRows(updated)
  }

  return (
    // render the popup with fields and buttons
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
      <h>{type}: {category_name}</h>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {
            rows.map((row, index) => (
            <tr key={row.id}>
              <td>
                <input
                  className={"popupField"}
                  type="text"
                  value={row.name}
                  onChange={(e) =>
                    handleFieldChange(row.id, "name", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  className={"popupField"}
                  type="number"
                  value={row.amount}
                  onChange={(e) =>
                    handleFieldChange(row.id, "amount", e.target.value)
                  }
                />
              </td>
              <td>
                {
                  index===rows.length-1?
                  <button
                      className="change-btn"
                      onClick={() => onAddRow(row, type, category_name)}
                    >
                      Add
                  </button>
                  :
                  <button
                    className="change-btn"
                    onClick={() => onUpdateRow(row, type, category_name)}
                  >
                    Save
                  </button>
                }
              </td>
              <td>
              {
                <button
                  className="delete-btn"
                  onClick={() => onDeleteRow(row, type)}
                >
                  Delete
                </button>
              }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default App
