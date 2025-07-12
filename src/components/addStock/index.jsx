import React from 'react'
import c from './add.module.scss'
import { Icons } from '../../assets/icons'

const emptyRow = {
  name: '',
  quantity: '',
  price: '',
  category: '',
  price_seller: '',
  code: '',
  unit: 'шт',
  fixed_quantity: ''
}

const AddStock = ({ setActive }) => {
  const [rows, setRows] = React.useState([emptyRow])
  const [categories, setCategories] = React.useState([])
  const [branches, setBranches] = React.useState([])

  const BRANCH_URLS = {
    'Сокулук': 'https://auncrm.pythonanywhere.com',
    'Беловодское': 'https://auncrm2.pythonanywhere.com',
  }

  const handleChange = (index, field, value) => {
    setRows(prev =>
      prev.map((row, i) => {
        if (i !== index) return row
        if (field === 'quantity') {
          return {
            ...row,
            quantity: value,
            fixed_quantity: row.fixed_quantity || value
          }
        }
        return { ...row, [field]: value }
      })
    )
  }

  const toggleBranch = (branchName) => {
    setBranches(prev =>
      prev.includes(branchName)
        ? prev.filter(b => b !== branchName)
        : [...prev, branchName]
    )
  }

  const addRow = () => setRows(prev => [...prev, emptyRow])

  const handleSave = async () => {
    if (branches.length === 0) {
      alert('Выберите хотя бы один филиал')
      return
    }

    const payload = rows.map(item => ({
      name: item.name,
      code: item.code.split(',').map(c => c.trim()).filter(Boolean),
      quantity: +item.quantity || 0,
      price: +item.price || 0,
      price_seller: +item.price_seller || 0,
      unit: item.unit || 'шт',
      fixed_quantity: +item.fixed_quantity || +item.quantity || 0,
      category_id: +item.category || null
    }))

    let success = true

    for (const branch of branches) {
      const url = BRANCH_URLS[branch]
      if (!url) continue

      try {
        // Загружаем существующие товары
        const existingRes = await fetch(`${url}/clients/stocks/`)
        const existingData = await existingRes.json()

        for (const item of payload) {
          const alreadyExists = existingData.some(existing =>
            existing.code?.split(',').map(c => c.trim()).some(c => item.code.includes(c))
          )

          if (!alreadyExists) {
            const res = await fetch(`${url}/clients/stocks/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([item])
            })

            if (!(res.status === 201 || res.status === 200)) {
              alert(`Ошибка при добавлении товара в "${branch}"`)
              success = false
            }
          }
        }
      } catch (err) {
        console.error(`Ошибка при сохранении товара в "${branch}":`, err)
        success = false
      }
    }

    if (success) {
      alert('Товары успешно добавлены (без дублирования)')
      setActive(false)
      window.location.reload()
    }
  }

  React.useEffect(() => {
    // по умолчанию загрузим категории из первого филиала
    fetch(`https://auncrm.pythonanywhere.com/clients/categories/`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Не удалось загрузить категории:', err))
  }, [])

  return (
    <div className={c.addExpense}>
      <div className={c.addExpense__header}>
        <h2>Добавление товара</h2>
      </div>

      {/* 🆕 Блок выбора филиалов */}
      <div className={c.branchCheckboxes}>
        <h4>Филиалы</h4>
        <div className={c.checks}>
          {['Сокулук', 'Беловодское'].map(branch => (
            <label key={branch}>
              <input
                type="checkbox"
                value={branch}
                checked={branches.includes(branch)}
                onChange={() => toggleBranch(branch)}
              />
              {branch}
            </label>
          ))}
        </div>
      </div>

      {rows.map((row, idx) => (
        <div key={idx} className={c.addExpense__form}>
          <div className={c.addExpense__form__item}>
            <label htmlFor={`code-${idx}`}>Код</label>
            <input
              id={`code-${idx}`}
              value={row.code}
              placeholder="Код товара (через запятую)"
              onChange={e => handleChange(idx, 'code', e.target.value)}
            />
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`name-${idx}`}>Наименование</label>
            <input
              id={`name-${idx}`}
              value={row.name}
              placeholder="Введите наименование"
              onChange={e => handleChange(idx, 'name', e.target.value)}
            />
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`cat-${idx}`}>Категория</label>
            <select
              id={`cat-${idx}`}
              value={row.category}
              onChange={e => handleChange(idx, 'category', e.target.value)}
            >
              <option value="">‒ выберите ‒</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`qty-${idx}`}>Количество</label>
            <input
              id={`qty-${idx}`}
              type="number"
              value={row.quantity}
              placeholder="0"
              onChange={e => handleChange(idx, 'quantity', e.target.value)}
            />
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`ps-${idx}`}>Цена поставщика</label>
            <input
              id={`ps-${idx}`}
              type="number"
              value={row.price_seller}
              placeholder="0"
              onChange={e => handleChange(idx, 'price_seller', e.target.value)}
            />
          </div>

          <div className={c.addExpense__form__item}>
            <label htmlFor={`pr-${idx}`}>Цена продажи</label>
            <input
              id={`pr-${idx}`}
              type="number"
              value={row.price}
              placeholder="0"
              onChange={e => handleChange(idx, 'price', e.target.value)}
            />
          </div>
        </div>
      ))}

      <button onClick={addRow}>
        <img src={Icons.plus} alt="" /> Добавить строку
      </button>

      <div className={c.res}>
        <button onClick={() => setActive(false)}>Отменить</button>
        <button onClick={handleSave}>
          <img src={Icons.addGreen} alt="" /> Сохранить
        </button>
      </div>
    </div>
  )
}

export default AddStock