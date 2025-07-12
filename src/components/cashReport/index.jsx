import React, { useEffect, useState } from 'react'

const BRANCH_URLS = {
  'Сокулук': 'https://auncrm.pythonanywhere.com/clients/cash-sessions',
  'Беловодское': 'https://auncrm2.pythonanywhere.com/clients/cash-sessions',
  // добавь другие при необходимости
}

const CashReport = () => {
  const [branch, setBranch] = useState('Сокулук')
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    const url = BRANCH_URLS[branch]
    fetch(url)
      .then(res => res.json())
      .then(data => setSessions(data))
      .catch(err => console.error('Ошибка загрузки смен:', err))
  }, [branch])

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>🧾 Кассовые смены ({branch})</h2>

      <div style={{ margin: '12px 0' }}>
        <label>Филиал:&nbsp;</label>
        <select value={branch} onChange={e => setBranch(e.target.value)} style={{ padding: 6 }}>
          {Object.keys(BRANCH_URLS).map((name, i) => (
            <option key={i} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead style={{ background: '#f0f0f0' }}>
          <tr>
            <th style={th}>Открытие</th>
            <th style={th}>Закрытие</th>
            <th style={th}>Сумма до</th>
            <th style={th}>Сумма после</th>
            <th style={th}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => (
            <tr key={i}>
              <td style={td}>{new Date(s.opened_at).toLocaleString('ru-RU')}</td>
              <td style={td}>{s.closed_at ? new Date(s.closed_at).toLocaleString('ru-RU') : '—'}</td>
              <td style={td}>{(+s.opening_sum).toFixed(2)} сом</td>
              <td style={td}>{s.closing_sum !== null ? (+s.closing_sum).toFixed(2) + ' сом' : '—'}</td>
              <td style={td}>{s.closed_at ? 'Закрыта' : 'Открыта'}</td>
            </tr>
          ))}
          {sessions.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#999' }}>Нет данных</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const th = { border: '1px solid #ccc', padding: 10, textAlign: 'left' }
const td = { border: '1px solid #eee', padding: 10 }

export default CashReport