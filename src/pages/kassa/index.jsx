import React, { use, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API } from '../../api'

const th = { border: '1px solid #ccc', padding: 10, textAlign: 'left' }
const td = { border: '1px solid #eee', padding: 10 }
const btn = { width: 28, height: 28, margin: '0 4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }
const delBtn = { ...btn, width: 30, background: '#ff4d4f', color: '#fff', border: 'none' }
const sendBtn = { background: '#3498db', color: '#fff', padding: '10px 20px', fontSize: 16, border: 'none', cursor: 'pointer' }

const BRANCH_URLS = {
  'Сокулук': 'https://auncrm.pythonanywhere.com',
  'Беловодское': 'https://auncrm2.pythonanywhere.com',
}

const Kassa = () => {
  const [goods, setGoods] = useState([])
  const [cart, setCart] = useState([])
  const [branch, setBranch] = useState('Сокулук')
  const [query, setQuery] = useState('')
  const [suggest, setSuggest] = useState([])
  const [highlight, setHighlight] = useState(-1)
  const [multipleMatches, setMultipleMatches] = useState(null)
  const [categories, setCategories] = useState([])

  const scanRef = useRef()
  const nameRef = useRef()
  const nav = useNavigate()
  const total = cart.reduce((s, i) => s + i.qty * +i.price, 0)

  useEffect(() => {
    API.getCategories()
      .then(res => setCategories(res.data))
  }, [])

  useEffect(() => {
    fetch(`${BRANCH_URLS[branch]}/clients/stocks/`)
      .then(res => res.json())
      .then(r => {
        const enriched = r.map(g => ({ ...g, code_array: g.code.split(',').map(c => c.trim()) }))
        setGoods(enriched)
      })
      .catch(e => console.error('Ошибка загрузки товаров', e))
  }, [branch])

  const handleScan = e => {
    if (e.key !== 'Enter') return
    const code = e.target.value.trim()
    if (!code) return

    const matches = goods.filter(g => g.code_array.includes(code))

    if (matches.length === 0) {
      alert('Товар не найден')
    } else if (matches.length === 1) {
      addToCart(matches[0])
    } else {
      setMultipleMatches(matches)
    }

    e.target.value = ''
  }

  const handleNameChange = e => {
    const val = e.target.value
    setQuery(val)
    if (val.length < 2) return setSuggest([])

    const re = new RegExp(val, 'i')
    setSuggest(goods.filter(g => re.test(g.name)).slice(0, 8))
    setHighlight(-1)
  }

  const keyNav = e => {
    if (!suggest.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => (h + 1) % suggest.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => (h - 1 + suggest.length) % suggest.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      chooseSuggest(highlight >= 0 ? highlight : 0)
    }
  }

  const chooseSuggest = i => {
    addToCart(suggest[i])
    setQuery('')
    setSuggest([])
    setHighlight(-1)
    nameRef.current.focus()
  }

  const addToCart = item => {
    setCart(prev => {
      const ex = prev.find(p => p.id === item.id)
      return ex ? prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p) : [...prev, { ...item, qty: 1 }]
    })
    console.log(item);
    
  }

  const changeQty = (i, d) => setCart(p => p.map((r, idx) => idx === i ? { ...r, qty: Math.max(1, r.qty + d) } : r))
  const setQtyManual = (i, v) => setCart(p => p.map((r, idx) => idx === i ? { ...r, qty: Math.max(1, parseInt(v) || 1) } : r))
  const updatePrice = (i, value) => setCart(p => p.map((r, idx) => idx === i ? { ...r, price: parseFloat(value) || 0 } : r))
  const removeRow = idx => setCart(p => p.filter((_, i) => i !== idx))

  const handleSendToStock = async () => {
    if (!cart.length) return alert('Корзина пуста')

    const url = `https://auncrm.pythonanywhere.com/clients/dispatches/`

    const items = cart.map(i => ({
      // stock: i.id, ← УБРАНО, потому что ID не из локальной БД
      code: i.code.split(',').map(c => c.trim())[0],
      name: i.name,
      quantity: i.qty,
      price: +i.price,
      total: +(i.qty * +i.price).toFixed(2),
    }))

    const payload = {
      recipient: branch,
      comment: `Отправка из интерфейса Kassa (${branch})`,
      items: items
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        console.error(err)
        throw new Error('Ошибка API')
      }

      alert('Успешно отправлено в историю отправок 📦')
      setCart([])
    } catch (e) {
      console.error(e)
      alert('Ошибка при отправке в /dispatches/')
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>📦 Отправка на склад</h2>

      <div style={{ marginBottom: 20 }}>
        <label>Филиал:&nbsp;</label>
        <select value={branch} onChange={e => setBranch(e.target.value)} style={{ padding: 6 }}>
          <option value="Сокулук">Сокулук</option>
          <option value="Беловодское">Беловодское</option>
        </select>
      </div>

      <input ref={scanRef} onKeyDown={handleScan} placeholder="Сканируйте штрих-код…"
        style={{ width: '100%', padding: 12, fontSize: 16, marginBottom: 20 }} />

      <div style={{ position: 'relative' }}>
        <input ref={nameRef} value={query} onChange={handleNameChange} onKeyDown={keyNav} placeholder="Название товара…"
          style={{ width: '100%', padding: 12, fontSize: 16, marginBottom: 20 }} />
        {suggest.length > 0 && (
          <ul style={{ position: 'absolute', zIndex: 1000, top: 48, left: 0, right: 0, maxHeight: 180, overflowY: 'auto', background: '#fff', border: '1px solid #ccc', listStyle: 'none', margin: 0, padding: 0 }}>
            {suggest.map((s, i) => (
              <li key={s.id} onMouseDown={() => chooseSuggest(i)}
                style={{ padding: '6px 12px', cursor: 'pointer', background: i === highlight ? '#f0f8ff' : 'transparent' }}>
                {s.name}
              </li>
            ))}
          </ul>
        )}
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
              <td style={td}>
                <input type="number" min={0} step={0.01} value={it.price} onChange={e => updatePrice(idx, e.target.value)}
                  style={{ width: 70, textAlign: 'center' }} />
              </td>
              <td style={td}>
                <button onClick={() => changeQty(idx, -1)} style={btn}>−</button>
                <input type="number" min={1} value={it.qty} onChange={e => setQtyManual(idx, e.target.value)}
                  style={{ width: 50, textAlign: 'center' }} />
                <button onClick={() => changeQty(idx, 1)} style={btn}>+</button>
                <div style={{ fontSize: 11, color: '#888' }}>Остаток: {it.quantity - it.qty}</div>
              </td>
              <td style={td}>{(it.qty * +it.price).toFixed(2)} сом</td>
              <td style={td}><button onClick={() => removeRow(idx)} style={delBtn}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ textAlign: 'right' }}>Итого: {total.toFixed(2)} сом</h3>

      <div style={{ textAlign: 'right' }}>
        <button onClick={handleSendToStock} style={sendBtn}>📤 Отправить в склад</button>
      </div>
    </div>
  )
}

export default Kassa;
