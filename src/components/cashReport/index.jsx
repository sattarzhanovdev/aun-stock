import React, { useEffect, useState } from 'react';

const BRANCH_URLS = {
  'Сокулук': 'https://auncrm.pythonanywhere.com',
  'Беловодское': 'https://auncrm2.pythonanywhere.com',
  'Кара-Балта': 'https://aunkarabalta.pythonanywhere.com'
};

const th = { border: '1px solid #ccc', padding: 10, textAlign: 'left', background: '#f0f0f0' };
const td = { border: '1px solid #eee', padding: 10 };

const modalOverlay = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 9999
};

const modalWindow = {
  backgroundColor: '#fff', borderRadius: 8, padding: 24, maxWidth: '90%', maxHeight: '90%',
  overflowY: 'auto', boxShadow: '0 0 20px rgba(0,0,0,0.3)', position: 'relative'
};

const closeBtn = {
  position: 'absolute', top: 10, right: 15, background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer'
};

const CashReport = () => {
  const [branch, setBranch] = useState('Сокулук');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSales, setSelectedSales] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BRANCH_URLS[branch]}/clients/cash-sessions`);
        const data = await res.json();
        const sorted = [...data].sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
        setSessions(sorted);
      } catch (err) {
        console.error('Ошибка загрузки смен:', err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [branch]);

  const handleSessionClick = async (session) => {
    setSelectedSales([]);
    setSelectedSession(session);
    setShowModal(true);

    try {
      const from = new Date(session.opened_at).toISOString();
      const to = session.closed_at ? new Date(session.closed_at).toISOString() : new Date().toISOString();

      const res = await fetch(`${BRANCH_URLS[branch]}/clients/sales/?from=${from}&to=${to}`);
      const data = await res.json();

      // 🔍 фильтруем вручную по дате, если API не фильтрует точно
      const filtered = data.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= new Date(session.opened_at) && saleDate <= new Date(session.closed_at);
      });

      const sorted = filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
      setSelectedSales(sorted);
    } catch (err) {
      console.error('Ошибка загрузки продаж:', err);
      setSelectedSales([]);
    }
  };

  const getTotalSum = () => {
    return selectedSales.reduce((total, sale) => {
      return total + sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, 0).toFixed(2);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'sans-serif' }}>
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
        <thead>
          <tr>
            <th style={th}>Открытие</th>
            <th style={th}>Закрытие</th>
            <th style={th}>Сумма до</th>
            <th style={th}>Сумма после</th>
            <th style={th}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center' }}>Загрузка...</td></tr>
          ) : sessions.length > 0 ? (
            sessions.map((s, i) => (
              <tr key={i} onClick={() => handleSessionClick(s)} style={{ cursor: 'pointer' }}>
                <td style={td}>{new Date(s.opened_at).toLocaleString('ru-RU')}</td>
                <td style={td}>{s.closed_at ? new Date(s.closed_at).toLocaleString('ru-RU') : '—'}</td>
                <td style={td}>{(+s.opening_sum).toFixed(2)} сом</td>
                <td style={td}>{s.closing_sum !== null ? (+s.closing_sum).toFixed(2) + ' сом' : '—'}</td>
                <td style={td}>{s.closed_at ? 'Закрыта' : 'Открыта'}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#999' }}>Нет данных</td></tr>
          )}
        </tbody>
      </table>

      {/* Модальное окно */}
      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div style={modalWindow} onClick={(e) => e.stopPropagation()}>
            <button style={closeBtn} onClick={() => setShowModal(false)}>×</button>
            <h3>Продажи за смену:</h3>
            <p><b>Смена:</b> {new Date(selectedSession.opened_at).toLocaleString('ru-RU')}</p>
            <p><b>Закрытие:</b> {selectedSession.closed_at ? new Date(selectedSession.closed_at).toLocaleString('ru-RU') : '—'}</p>

            {selectedSales.length === 0 ? (
              <p style={{ color: '#999' }}>Нет продаж</p>
            ) : selectedSales.map((sale, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <p><b>Продажа №{sale.id}</b> — {new Date(sale.date).toLocaleString('ru-RU')}</p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Товар</th>
                      <th style={th}>Цена</th>
                      <th style={th}>Кол-во</th>
                      <th style={th}>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, j) => (
                      <tr key={j}>
                        <td style={td}>{item.name}</td>
                        <td style={td}>{(+item.price).toFixed(2)} сом</td>
                        <td style={td}>{item.quantity}</td>
                        <td style={td}>{(item.price * item.quantity).toFixed(2)} сом</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {selectedSales.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <hr />
                <p><b>Итого за смену:</b> {getTotalSum()} сом</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CashReport;