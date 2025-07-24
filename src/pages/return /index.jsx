import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const th = { border: '1px solid #ccc', padding: 10, textAlign: 'left' }
const td = { border: '1px solid #eee', padding: 10 }
const btn = { width: 28, height: 28, margin: '0 4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }

const BRANCH_URLS = {
  'Сокулук': 'https://auncrm.pythonanywhere.com',
  'Беловодское': 'https://aunbelovodskiy.pythonanywhere.com',
  'Кара-Балта': 'https://aunkarabalta.pythonanywhere.com'
}

const Return = () => {
  const [items, setItems] = useState([])
  const [cart, setCart] = useState([])
  const [reason, setReason] = useState('customer')
  const [branch, setBranch] = useState('Сокулук')
  const [searchName, setSearchName] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)

  const inputRef = useRef()
  const navigate = useNavigate()
  const total = cart.reduce((s, i) => s + i.qty * +i.price, 0)

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${BRANCH_URLS[branch]}/clients/stocks/`)
        const data = await res.json()
        setItems(data)
      } catch (e) {
        console.error('Ошибка загрузки товаров:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSales()
  }, [branch])

  const handleScan = e => {
    if (e.key !== 'Enter') return
    const code = e.target.value.trim()
    if (!code) return

    const item = items.find(i => i.code?.split(',').map(c => c.trim()).includes(code))
    if (!item) {
      alert('Позиция с таким штрихкодом не найдена')
      e.target.value = ''
      return
    }

    addToCart(item)
    e.target.value = ''
  }

  const handleSearchChange = e => {
    const value = e.target.value
    setSearchName(value)

    const filtered = items.filter(i => i.name?.toLowerCase().includes(value.toLowerCase()))
    setSuggestions(filtered.slice(0, 5))
  }

  const selectSuggestion = item => {
    addToCart(item)
    setSearchName('')
    setSuggestions([])
  }

  const addToCart = item => {
    setCart(prev => {
      const ex = prev.find(p => p.id === item.id)
      return ex
        ? prev.map(p => p.id === item.id ? { ...p, qty: Math.min(p.qty + 1, item.quantity) } : p)
        : [...prev, {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          code: item.code,
          qty: 1
        }]
    })
  }

  const changeQty = (idx, d) =>
    setCart(p => p.map((r, i) => i === idx ? { ...r, qty: Math.max(1, Math.min(r.qty + d, r.quantity)) } : r))

  const manualQty = (idx, v) =>
    setCart(p => p.map((r, i) => i === idx ? { ...r, qty: Math.max(1, Math.min(parseInt(v) || 1, r.quantity)) } : r))

  const remove = idx => setCart(p => p.filter((_, i) => i !== idx))

  const handleReturn = async () => {
    if (!cart.length) return alert('Корзина пуста')
    setLoading(true)

    try {
      // 1. Отправка на склад
      await Promise.all(cart.map(item => {
        const payload = [{
          name: item.name,
          price: item.price,
          quantity: item.qty,
          code: item.code?.split(',').map(c => c.trim()).filter(Boolean) || [],
          unit: 'шт',
          price_seller: item.price,
          fixed_quantity: item.qty
        }]
        return fetch(`https://auncrm2.pythonanywhere.com/clients/stocks/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }))

      // 2. Удаление с выбранного филиала
      const branchUrl = BRANCH_URLS[branch]  // <-- фикс: используем выбранный филиал
      const responses = await Promise.all(
        cart.map(item =>
          fetch(`${branchUrl}/clients/stocks/${item.id}/`, { method: 'DELETE' })
        )
      )

      const failed = responses.filter(r => r && !r.ok)
      if (failed.length > 0) {
        throw new Error('Ошибка при удалении товаров из филиала')
      }

      alert('Возврат успешно оформлен и товары переданы на склад')
      setCart([])
    } catch (error) {
      console.error('Ошибка при возврате:', error)
      alert('Произошла ошибка при возврате')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>🔄 Возврат товара</h2>

      <div style={{ marginBottom: 20 }}>
        <label>Филиал:&nbsp;</label>
        <select value={branch} onChange={e => setBranch(e.target.value)} style={{ padding: 6 }}>
          {Object.keys(BRANCH_URLS).map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <input
        ref={inputRef}
        placeholder="Сканируйте штрихкод…"
        onKeyDown={handleScan}
        autoFocus
        style={{ width: '100%', padding: 12, fontSize: 16, marginBottom: 10 }}
      />

      <input
        placeholder="Введите название товара…"
        value={searchName}
        onChange={handleSearchChange}
        style={{ width: '100%', padding: 12, fontSize: 16, marginBottom: 5 }}
      />

      {suggestions.length > 0 && (
        <ul style={{ border: '1px solid #ccc', listStyle: 'none', margin: 0, padding: 10, background: '#fff', maxHeight: 150, overflowY: 'auto' }}>
          {suggestions.map((sug, idx) => (
            <li key={idx} style={{ padding: 5, cursor: 'pointer' }} onClick={() => selectSuggestion(sug)}>
              {sug.name}
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginBottom: 20 }}>
        <label>Причина:&nbsp;</label>
        <select value={reason} onChange={e => setReason(e.target.value)}>
          <option value="customer">Покупатель вернул</option>
          <option value="defect">Дефект</option>
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead style={{ background: '#f0f0f0' }}>
          <tr>
            <th style={th}>Название</th>
            <th style={th}>Цена</th>
            <th style={th}>Кол-во</th>
            <th style={th}>Сумма</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((it, idx) => (
            <tr key={idx}>
              <td style={td}>{it.name}</td>
              <td style={td}>{(+it.price).toFixed(2)} сом</td>
              <td style={td}>
                <button onClick={() => changeQty(idx, -1)} style={btn}>−</button>
                <input
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={e => manualQty(idx, e.target.value)}
                  style={{ width: 50, textAlign: 'center' }}
                />
                <button onClick={() => changeQty(idx, 1)} style={btn}>+</button>
                <div style={{ fontSize: 11, color: '#888' }}>Доступно: {it.quantity}</div>
              </td>
              <td style={td}>{(it.qty * +it.price).toFixed(2)} сом</td>
              <td style={td}>
                <button onClick={() => remove(idx)} style={{ ...btn, background: '#ff4d4f', color: '#fff' }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ textAlign: 'right' }}>К возврату: {total.toFixed(2)} сом</h3>

      <div style={{ textAlign: 'right', marginTop: 20 }}>
        <button
          onClick={handleReturn}
          style={{
            background: '#f39c12',
            color: '#fff',
            padding: '10px 20px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🛒 Оформить возврат
        </button>
      </div>

      {loading && <PopupLoader />}
    </div>
  )
}

const PopupLoader = () => (
  <div style={{
    position: 'fixed',
    top: 0, left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  }}>
    <div style={{
      background: '#fff',
      padding: '30px 40px',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontSize: 18,
      fontWeight: 500
    }}>
      ⏳ Оформляем возврат...
    </div>
  </div>
)

export default Return