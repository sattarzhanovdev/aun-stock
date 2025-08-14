import React, { useRef } from 'react'
import html2pdf from 'html2pdf.js'
import c from './workers.module.scss'

const API_BASE = 'https://auncrm.pythonanywhere.com'

const DispatchHistory = () => {
  const [month, setMonth] = React.useState('')
  const [data, setData] = React.useState(null)
  const [selected, setSelected] = React.useState(null)

  // editable "Кому"
  const [recipient, setRecipient] = React.useState('')
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

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML
    const printWindow = window.open('', '', 'height=600,width=800')
    printWindow.document.write('<html><head><title>Накладная</title>')
    printWindow.document.write('<style>table { width: 100%; border-collapse: collapse } th, td { border: 1px solid #000; padding: 5px; } body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}</style>')
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

    const safeRecipient = (recipient || selected?.recipient || 'Получатель')
      .replace(/[\\/:*?"<>|]/g, '_')

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

  const handleSaveRecipient = async () => {
    if (!selected) return
    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/clients/dispatches/${selected.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ recipient: recipient || '' }),
      })
      if (!res.ok) throw new Error('Не удалось сохранить получателя')
      const updated = await res.json()

      setData(prev => prev.map(row => (row.id === updated.id ? { ...row, ...updated } : row)))
      setSelected(prev => (prev ? { ...prev, ...updated } : prev))
      alert('Сохранено')
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
              <tr
                key={index}
                onClick={() => {
                  setSelected(item)
                  setRecipient(item.recipient || '')
                }}
                style={{ cursor: 'pointer' }}
              >
                <td>{new Date(item.date).toLocaleDateString('ru-RU')}</td>
                <td>{item.recipient}</td>
                <td>{item.total} сом</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className={c.popup}>
          {/* Панель редактирования (не печатается) */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
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
                  <th>Единица измерения</th>
                  <th>Количество</th>
                  <th>Цена (сом)</th>
                  <th>Сумма (сом)</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>{item.name}</td>
                    <td style={{ textAlign: 'center' }}>шт</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{item.price}</td>
                    <td style={{ textAlign: 'right' }}>{item.total}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(10 - selected.items.length, 0) }).map((_, idx) => (
                  <tr key={`empty-${idx}`}>
                    <td style={{ textAlign: 'center' }}>{selected.items.length + idx + 1}</td>
                    <td colSpan={5}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <p><strong>Итого:</strong> {selected.total} сом</p>
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

          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <button onClick={handleSaveRecipient} disabled={saving}>
              {saving ? 'Сохранение…' : '💾 Сохранить в backend'}
            </button>
            <button onClick={handlePrint}>🖨️ Распечатать</button>
            <button onClick={handleDownloadPDF}>📄 Сохранить PDF</button>
            <button onClick={() => setSelected(null)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DispatchHistory