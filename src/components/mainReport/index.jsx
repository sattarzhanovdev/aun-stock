import React from 'react'
import c from './mainReport.module.scss'
import { Icons } from '../../assets/icons'
import { API } from '../../api'

const MainReport = () => {
  const [combinedData, setCombinedData] = React.useState({
    income: 0,
    expense: 0,
    profit: 0,
    clients: 0,
    benefit: 0
  })
  const [branchData, setBranchData] = React.useState([])

  const endpoints = [
    {
      name: 'Сокулук',
      url: 'https://auncrm.pythonanywhere.com'
    },
    {
      name: 'Беловодское',
      url: 'https://aunbelovodskiy.pythonanywhere.com'
    },
    {
      name: 'Кара-Балта',
      url: 'https://aunkarabalta.pythonanywhere.com'
    }
  ]

  React.useEffect(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const fetchBranchStats = async () => {
      let totalIncome = 0
      let totalExpense = 0
      let totalProfit = 0
      let totalClients = 0
      let totalBenefit = 0

      const results = []

      for (const branch of endpoints) {
        try {
          const [txRes, salesRes] = await Promise.all([
            fetch(`${branch.url}/clients/transactions/`),
            fetch(`${branch.url}/clients/sales/`)
          ])

          const txData = await txRes.json()
          const salesData = await salesRes.json()

          const thisMonthTransactions = txData.filter(tx => {
            const txDate = new Date(tx.date)
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
          })

          const income = thisMonthTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + Number(tx.amount), 0)

          const expense = thisMonthTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + Number(tx.amount), 0)

          const clientsCount = thisMonthTransactions
            .filter(tx => tx.client)
            .map(tx => tx.client)
            .filter((v, i, arr) => arr.indexOf(v) === i).length

          const benefit = salesData.reduce((sum, sale) => sum + Number(sale.total), 0)

          const profit = income - expense

          totalIncome += income
          totalExpense += expense
          totalProfit += profit
          totalClients += clientsCount
          totalBenefit += benefit

          results.push({
            branch: branch.name,
            income,
            expense,
            profit,
            clients: clientsCount,
            benefit
          })
        } catch (e) {
          console.error(`Ошибка загрузки данных с ${branch.name}:`, e)
        }
      }

      setCombinedData({
        income: totalIncome,
        expense: totalExpense,
        profit: totalProfit,
        clients: totalClients,
        benefit: totalBenefit
      })
      setBranchData(results)
    }

    fetchBranchStats()
  }, [])

  return (
    <div className={c.reports}>
      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.date} alt="date" />
          <h3>Общий оборот / прибыль</h3>
        </div>
        <div className={c.down}>
          <h1>{combinedData.benefit} / {combinedData.profit}</h1>
          {/* <button>Посмотреть</button> */}
        </div>
      </div>

      <div className={c.card}>
        <div className={c.up}>
          <img src={Icons.expenses} alt="expenses" />
          <h3>Общие расходы</h3>
        </div>
        <div className={c.down}>
          <h1>{combinedData.expense}</h1>
          {/* <button>Посмотреть</button> */}
        </div>
      </div>

      {branchData.map((b, i) => (
        <div className={c.card} key={i}>
          <div className={c.up}>
            <img src={Icons.date} alt="branch" />
            <h3>{b.branch}</h3>
          </div>
          <div className={c.down}>
            <h1>{b.benefit} / {b.profit}</h1>
            <small>Расход: {b.expense} | Клиенты: {b.clients}</small>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MainReport