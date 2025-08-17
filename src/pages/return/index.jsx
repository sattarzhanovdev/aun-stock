import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BRANCH_URLS = {
  'Сокулук': 'https://auncrm.pythonanywhere.com',
  'Склад': 'https://auncrm2.pythonanywhere.com',
  'Беловодское': 'https://aunbelovodskiy.pythonanywhere.com',
  'Кара-Балта': 'https://aunkarabalta.pythonanywhere.com',
  'Токмок ': null,
  'Аптека ': null,
  'Баня': null,
  'Хайван': null,
  'Дастан': null,
  'Кубатбек': null,
  'Калыбек': null,
  'Батырбек': null,
  'Айжан': null,
  'Эрзи': null
}

const Return = () => {
  const [items, setItems] = useState([])
  const [cart, setCart] = useState([])
  const [branch, setBranch] = useState('Сокулук')
  const [searchName, setSearchName] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const printRef = useRef()

  const navigate = useNavigate()
  const total = cart.reduce((s, i) => s + i.qty * +i.price, 0)

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true)
      try {
        const res = await fetch(`https://auncrm.pythonanywhere.com/clients/dispatches/`)
        const all = await res.json()
        const filtered = all.filter(d => d.recipient?.trim().toLowerCase() === branch.trim().toLowerCase())
        const itemsList = filtered.flatMap(d => d.items || [])
        const enriched = itemsList.map((item, idx) => ({
          id: idx + 1,
          name: item.name,
          price: item.price,
          code: item.code,
          quantity: item.quantity ?? item.qty ?? 1
        }))
        setItems(enriched)
      } catch (e) {
        console.error('Ошибка загрузки dispatches:', e)
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
      const ex = prev.find(p => p.name === item.name)
      return ex
        ? prev.map(p => p.name === item.name ? { ...p, qty: Math.min(p.qty + 1, item.quantity) } : p)
        : [...prev, { ...item, qty: 1 }]
    })
  }

  const changeQty = (idx, d) => setCart(p => p.map((r, i) => i === idx ? { ...r, qty: Math.max(1, r.qty + d) } : r))
  const manualQty = (idx, v) => setCart(p => p.map((r, i) => i === idx ? { ...r, qty: Math.max(1, parseInt(v) || 1) } : r))
  const remove = idx => setCart(p => p.filter((_, i) => i !== idx))

  const handleReturn = async () => {
  if (!cart.length) return alert('Корзина пуста')
  setLoading(true)

  try {
    // Загружаем список со склада
    const stockRes = await fetch(`https://auncrm2.pythonanywhere.com/clients/stocks/`)
    const stockList = await stockRes.json()

    // Загружаем dispatches
    const dispatchRes = await fetch(`https://auncrm.pythonanywhere.com/clients/dispatches/`)
    const dispatches = await dispatchRes.json()

    for (const item of cart) {
      const codeArr = item.code?.split(',').map(c => c.trim())

      // --- 1. Обработка склада ---
      const existingStock = stockList.find(s =>
        s.code?.split(',').some(c => codeArr.includes(c))
      )

      if (existingStock) {
        await fetch(`https://auncrm2.pythonanywhere.com/clients/stocks/${existingStock.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...existingStock,
            quantity: Number(existingStock.quantity) + Number(item.qty),
            fixed_quantity: (Number(existingStock.fixed_quantity) || 0) 
          })
        })
      } else {
        await fetch(`https://auncrm2.pythonanywhere.com/clients/stocks/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            price: item.price,
            quantity: item.qty,
            fixed_quantity: item.qty,
            code: item.code,
            unit: 'шт',
            price_seller: item.price
          })
        })
      }

      // --- 2. Обработка dispatches ---
      const targetDispatch = dispatches.find(d =>
        d.recipient?.trim().toLowerCase() === branch.trim().toLowerCase() &&
        d.items?.some(it => it.code?.split(',').some(c => codeArr.includes(c)))
      )

      if (targetDispatch) {
        const newItems = targetDispatch.items
          .map(it => {
            if (it.code?.split(',').some(c => codeArr.includes(c))) {
              const newQty = (it.quantity ?? it.qty ?? 1) - item.qty
              if (newQty <= 0) return null // Удаляем товар
              return { ...it, quantity: newQty }
            }
            return it
          })
          .filter(Boolean)

        if (newItems.length === 0) {
          // Удалить весь dispatch
          await fetch(`https://auncrm.pythonanywhere.com/clients/dispatches/${targetDispatch.id}/`, {
            method: 'DELETE'
          })
        } else {
          // Обновить dispatch
          await fetch(`https://auncrm.pythonanywhere.com/clients/dispatches/${targetDispatch.id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...targetDispatch, items: newItems })
          })
        }
      }
    }

    // --- 3. Удаление из филиала, если branch имеет URL ---
    const branchUrl = BRANCH_URLS[branch]
    if (branchUrl) {
      const branchStockRes = await fetch(`${branchUrl}/clients/stocks/`)
      const branchStock = await branchStockRes.json()

      for (const item of cart) {
        const codeArr = item.code?.split(',').map(c => c.trim())
        const target = branchStock.find(s =>
          s.code?.split(',').some(c => codeArr.includes(c))
        )

        if (!target) continue

        if (target.quantity > item.qty) {
          await fetch(`${branchUrl}/clients/stocks/${target.id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...target,
              quantity: Number(target.quantity) - Number(item.qty),
              fixed_quantity: (target.fixed_quantity || 0) - item.qty
            })
          })
        } else {
          await fetch(`${branchUrl}/clients/stocks/${target.id}/`, {
            method: 'DELETE'
          })
        }
      }
    }else{
      const branchStockRes = await fetch(`https://auncrm2.pythonanywhere.com/clients/stocks/`)
      const branchStock = await branchStockRes.json()
      for (const item of cart) {
        const codeArr = item.code?.split(',').map(c => c.trim())
        const target = branchStock.find(s =>
          s.code?.split(',').some(c => codeArr.includes(c))
        )

        if (!target) continue

        if (target.quantity > item.qty) {
          await fetch(`https://auncrm2.pythonanywhere.com/clients/stocks/${target.id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...target,
              quantity: Number(target.quantity) + Number(item.qty)
            })
          })
        } else {
          await fetch(`${branchUrl}/clients/stocks/${target.id}/`, {
            method: 'DELETE'
          })
        }
      }
    }

    alert('Возврат успешно оформлен')
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
      <input placeholder="Штрихкод…" onKeyDown={handleScan} style={{ width: '100%', padding: 12, fontSize: 16, marginBottom: 10 }} />
      <input placeholder="Введите название…" value={searchName} onChange={handleSearchChange} style={{ width: '100%', padding: 12, fontSize: 16 }} />
      {suggestions.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 10, background: '#fff' }}>
          {suggestions.map((s, i) => <li key={i} onClick={() => selectSuggestion(s)} style={{ cursor: 'pointer', padding: 5 }}>{s.name}</li>)}
        </ul>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr>
            <th>Название</th>
            <th>Цена</th>
            <th>Кол-во</th>
            <th>Сумма</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item, idx) => (
            <tr key={idx}>
              <td>{item.name}</td>
              <td>{(+item.price).toFixed(2)}</td>
              <td>
                <button onClick={() => changeQty(idx, -1)}>-</button>
                <input type="number" value={item.qty} onChange={e => manualQty(idx, e.target.value)} style={{ width: 50 }} />
                <button onClick={() => changeQty(idx, 1)}>+</button>
              </td>
              <td>{(item.qty * item.price).toFixed(2)}</td>
              <td><button onClick={() => remove(idx)} style={{ background: '#f44', color: '#fff' }}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ textAlign: 'right' }}>Итого: {total.toFixed(2)} сом</h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button onClick={handleReturn} style={{ background: '#f39c12', color: '#fff', padding: '10px 20px' }}>🛒 Оформить возврат</button>
      </div>

      <div ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <h2 style={{ textAlign: 'center' }}>Накладная</h2>
        <p><b>Филиал:</b> {branch}</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000' }}>№</th>
              <th style={{ border: '1px solid #000' }}>Название</th>
              <th style={{ border: '1px solid #000' }}>Кол-во</th>
              <th style={{ border: '1px solid #000' }}>Цена</th>
              <th style={{ border: '1px solid #000' }}>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #000' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000' }}>{item.name}</td>
                <td style={{ border: '1px solid #000' }}>{item.qty}</td>
                <td style={{ border: '1px solid #000' }}>{(+item.price).toFixed(2)}</td>
                <td style={{ border: '1px solid #000' }}>{(item.qty * item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <div style={{ position: 'fixed', top: 0, left: 0, background: '#0006', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>⏳ Оформляем возврат...</div>}
    </div>
  )
}

export default Return