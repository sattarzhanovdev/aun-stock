import React from 'react'
import c from './workers.module.scss'

const DispatchHistory = () => {
  const [month, setMonth] = React.useState('')
  const [data, setData] = React.useState(null)
  const [selected, setSelected] = React.useState(null)

  React.useEffect(() => {
    const date = new Date()
    const m = date.toLocaleString('ru', { month: 'long' })
    setMonth(m.charAt(0).toUpperCase() + m.slice(1))
  }, [])

  React.useEffect(() => {
    fetch('https://auncrm.pythonanywhere.com/clients/dispatches/')
      .then(res => res.json())
      .then(res => {
        const sorted = res.sort((a, b) => new Date(b.date) - new Date(a.date))
        setData(sorted)
      })
      .catch(err => console.error('Ошибка загрузки отправок:', err))
  }, [])

  return (
    <div className={c.workers}>
      <div className={c.table}>
        <div className={c.table__header}>
          <h2>История отправок за {month}</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Куда</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {
              data && data.map((item, index) => (
                <tr key={index} onClick={() => setSelected(item)} style={{ cursor: 'pointer' }}>
                  <td>{new Date(item.date).toLocaleDateString('ru-RU')}</td>
                  <td>{item.recipient}</td>
                  <td>{item.total} сом</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {selected && (
        <div className={c.popup}>
          <div className={c.popup__content}>
            <h3>📦 Отправка: {selected.recipient}</h3>
            <p>Дата: {new Date(selected.date).toLocaleString('ru-RU')}</p>
            <p>Комментарий: {selected.comment || '—'}</p>

            <table style={{ width: '100%', marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Товар</th>
                  <th>Кол-во</th>
                  <th>Цена</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.price}</td>
                    <td>{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={() => setSelected(null)} className={c.closeBtn}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DispatchHistory