import React from 'react'
import c from './workers.module.scss'
import { Components } from '..'
import { API } from '../../api'

const FinancesTable = () => {
  const [month, setMonth] = React.useState('')
  const [active, setActive] = React.useState(false)
  const [data, setData] = React.useState([])

  React.useEffect(() => {
    const date = new Date()
    const m = date.toLocaleString('ru', { month: 'long' })
    setMonth(m.charAt(0).toUpperCase() + m.slice(1))
  }, [])

  React.useEffect(() => {
    API.getSales()
      .then(res => {
        setData(res.data)
      })
      .catch(err => console.error('Ошибка загрузки транзакций:', err))
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleString('ru', { month: 'long' })
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${day}`
  }

  return (
    <div className={c.workers}>
      <div className={c.table}>
        <table>
          <thead>
            <tr>
              <th>Время</th>
              {/* <th>Наименование</th> */}
              {/* <th>Количество</th> */}
              <th>
                Прайс по итогу
                <button onClick={() => setActive(true)}>
                  + Добавить
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>
                  <div className={c.date}>
                    {formatDate(item.date)}
                  </div>
                </td>
                {/* <td>{item.name}</td> */}
                {/* <td>{item.quantity}</td> */}
                <td>{item.total} сом</td>
                <td>{item.payment_type === 'cash' ? 'Наличными' : 'Картой'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && <Components.AddProfit setActive={setActive} />}
    </div>
  )
}

export default FinancesTable
