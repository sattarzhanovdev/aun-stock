import React, { useRef } from 'react'
import html2pdf from 'html2pdf.js'
import c from './workers.module.scss'

const API_BASE = 'https://auncrm.pythonanywhere.com'

const toNum = (v) => {
  const n = typeof v === 'string' ? v.replace(',', '.').trim() : v
  const x = Number(n)
  return Number.isFinite(x) ? x : 0
}
const money = (n) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toNum(n))

const DispatchHistory = () => {
  const [month, setMonth] = React.useState('')
  const [data, setData] = React.useState(null)
  const [selected, setSelected] = React.useState(null)

  // локально редактируемые поля
  const [recipient, setRecipient] = React.useState('')
  const [rows, setRows] = React.useState([]) // [{id, name, unit, quantity, price, total}]
  const [saving, setSaving] = React.useState(false)

  const printRef = useRef()

  React.useEffect(() => {
    const date = new Date()
    const m = date.toLocaleString('ru', { month: 'long' })
    setMonth(m.charAt(0).toUpperCase() + m.slice(1))
  }, [])

  React.useEffect(() => {
    fetch(`${API_BASE}/clients/dispatches/`)
      .then(res => res.json())
      .then(res => {
        const sorted = res.sort((a, b) => new Date(b.date) - new Date(a.date))
        setData(sorted)
      })
      .catch(err => console.error('Ошибка загрузки отправок:', err))
  }, [])

  const onPickRow = (item) => {
    setSelected(item)
    setRecipient(item.recipient || '')
    setRows((item.items || []).map(r => ({
      id: r.id, name: r.name, unit: r.unit || 'шт',
      quantity: toNum(r.quantity),
      price: toNum(r.price),
      total: toNum(r.total)
    })))
  }

  const recalcRow = (idx, patch) => {
    setRows(prev => {
      const next = [...prev]
      const row = { ...next[idx], ...patch }
      const q = toNum(row.quantity)
      const p = toNum(row.price)
      row.total = +(q * p).toFixed(2)
      next[idx] = row
      return next
    })
  }

  const calcTotal = React.useMemo(
    () => rows.reduce((s, r) => s + toNum(r.total), 0),
    [rows]
  )

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML
    const printWindow = window.open('', '', 'height=600,width=800')
    printWindow.document.write('<html><head><title>Накладная</title>')
    printWindow.document.write('<style>table{width:100%;border-collapse:collapse} th,td{border:1px solid #000;padding:5px} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}</style>')
    printWindow.document.write('</head><body class="pagebreak">')
    printWindow.document.write(printContents)
    printWindow.document.write('</body></html>')
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  const handleDownloadPDF = () => {
    const element = printRef.current
    const prev = {
      maxHeight: element.style.maxHeight,
      overflow: element.style.overflow,
      height: element.style.height,
    }
    element.style.maxHeight = 'none'
    element.style.overflow = 'visible'
    element.style.height = 'auto'

    const safeRecipient = (recipient || selected?.recipient || 'Получатель').replace(/[\\/:*?"<>|]/g, '_')

    const opt = {
      margin: 0.5,
      filename: `накладная-${safeRecipient}-${new Date(selected.date).toLocaleDateString('ru-RU')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }

    html2pdf().set(opt).from(element).save().then(() => {
      element.style.maxHeight = prev.maxHeight
      element.style.overflow = prev.overflow
      element.style.height = prev.height
    })
  }

  const handleSaveBackend = async () => {
    if (!selected) return
    try {
      setSaving(true)
      // готовим только то, что нужно бэку
      const payload = {
        recipient: recipient || '',
        items: rows.map(r => ({
          id: r.id,
          quantity: toNum(r.quantity),
          price: toNum(r.price),
          // total на сервере пересчитается, можно не слать
        })),
      }

      const res = await fetch(`${API_BASE}/clients/dispatches/${selected.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Не удалось сохранить изменения')
      const updated = await res.json()

      // Обновляем таблицу и выбранную запись
      setData(prev => prev.map(x => (x.id === updated.id ? { ...x, ...updated } : x)))
      setSelected(updated)
      setRecipient(updated.recipient || '')
      setRows((updated.items || []).map(r => ({
        id: r.id, name: r.name, unit: r.unit || 'шт',
        quantity: toNum(r.quantity), price: toNum(r.price), total: toNum(r.total)
      })))

      alert('Сохранено в backend')
    } catch (e) {
      console.error(e)
      alert('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

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
            {data && data.map((item, index) => (
              <tr key={index} onClick={() => onPickRow(item)} style={{ cursor: 'pointer' }}>
                <td>{new Date(item.date).toLocaleDateString('ru-RU')}</td>
                <td>{item.recipient}</td>
                <td>{money(item.total)} сом</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className={c.popup}>
          {/* Панель редактирования (не печатается) */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <label style={{ whiteSpace: 'nowrap' }}>
              Кому:&nbsp;
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Получатель"
                style={{ padding: 6, minWidth: 260 }}
              />
            </label>
            <button onClick={handleSaveBackend} disabled={saving}>
              {saving ? 'Сохранение…' : '💾 Сохранить в backend'}
            </button>
            <button onClick={handlePrint}>🖨️ Печать</button>
            <button onClick={handleDownloadPDF}>📄 PDF</button>
            <button onClick={() => setSelected(null)}>Закрыть</button>
          </div>

          {/* Печатаемая область */}
          <div className={c.popup__content} ref={printRef}>
            <h2 style={{ textAlign: 'center', marginBottom: 8 }}>НАКЛАДНАЯ № ______</h2>
            <p style={{ textAlign: 'right' }}>{new Date(selected.date).toLocaleDateString('ru-RU')} г</p>

            <p><strong>Кому:</strong> {recipient || selected.recipient}</p>
            <p><strong>От кого:</strong> Склад AUN</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }} border={1}>
              <thead>
                <tr>
                  <th>№ п/п</th>
                  <th>Наименование</th>
                  <th>Ед.</th>
                  <th style={{ width: 120 }}>Количество</th>
                  <th style={{ width: 140 }}>Цена (сом)</th>
                  <th>Сумма (сом)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>{r.name}</td>
                    <td style={{ textAlign: 'center' }}>{r.unit || 'шт'}</td>

                    {/* Количество — редактируемое */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={r.quantity}
                        onChange={(e) => recalcRow(idx, { quantity: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', textAlign: 'right' }}
                      />
                    </td>

                    {/* Цена — редактируемая */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={r.price}
                        onChange={(e) => recalcRow(idx, { price: e.target.value })}
                        style={{ width: '100%', boxSizing: 'border-box', textAlign: 'right' }}
                      />
                    </td>

                    {/* Сумма — авто */}
                    <td style={{ textAlign: 'right' }}>{money(r.total)}</td>
                  </tr>
                ))}

                {Array.from({ length: Math.max(10 - rows.length, 0) }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td style={{ textAlign: 'center' }}>{rows.length + i + 1}</td>
                    <td colSpan={5}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <p><strong>Итого:</strong> {money(calcTotal)} сом</p>
              <p>В том числе НДС (0%)</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
              <div>
                <p>Сдал: _____________</p>
                <p>подпись</p>
                <p>Ф.И.О.</p>
              </div>
              <div>
                <p>Принял: _____________</p>
                <p>подпись</p>
                <p>Ф.И.О.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DispatchHistory