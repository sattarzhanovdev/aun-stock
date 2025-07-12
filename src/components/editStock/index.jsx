import React, { useEffect, useState } from 'react'
import c from './add.module.scss'
import { Icons } from '../../assets/icons'

const EditStock = ({ setActive }) => {
  const initial = JSON.parse(localStorage.getItem('editStock'))

  const [code, setCode] = useState(initial.code || '')
  const [name, setName] = useState(initial.name || '')
  const [quantity, setQuantity] = useState(initial.quantity || '')
  const [price, setPrice] = useState(initial.price || '')
  const [priceSeller, setPriceSeller] = useState(initial.price_seller || '')
  const [category, setCategory] = useState(initial.category?.id || '')
  const [unit] = useState(initial.unit || 'шт')
  const [fixedQuantity, setFixedQuantity] = useState(
    initial.fixed_quantity ?? initial.quantity ?? 0
  )
  const [cats, setCats] = useState([])
  const [branches, setBranches] = useState(['Сокулук']) // по умолчанию выбран один

  const BRANCH_URLS = {
    'Сокулук': 'https://auncrm.pythonanywhere.com',
    'Беловодское': 'https://auncrm2.pythonanywhere.com',
  }

  const toggleBranch = (branch) => {
    setBranches((prev) =>
      prev.includes(branch)
        ? prev.filter((b) => b !== branch)
        : [...prev, branch]
    )
  }

  const handleSave = async () => {
    const codeArray = code.split(',').map(c => c.trim()).filter(Boolean)

    const payload = {
      code: codeArray,
      name,
      quantity: +quantity || 0,
      price: +price || 0,
      price_seller: +priceSeller || 0,
      category_id: category ? +category : null,
      unit,
      fixed_quantity: +fixedQuantity || 0
    }

    let success = true

    for (const branch of branches) {
      const url = BRANCH_URLS[branch]
      if (!url) continue

      try {
        const putRes = await fetch(`${url}/clients/stocks/${initial.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (putRes.status === 404) {
          // Если нет — создаём
          const postRes = await fetch(`${url}/clients/stocks/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([payload])
          })

          if (!postRes.ok) {
            alert(`Ошибка при создании товара в "${branch}"`)
            success = false
          }
        } else if (!putRes.ok) {
          alert(`Ошибка при обновлении товара в "${branch}"`)
          success = false
        }
      } catch (err) {
        console.error(`Ошибка в "${branch}":`, err)
        success = false
      }
    }

    if (success) {
      alert('Товар успешно сохранён во всех выбранных филиалах')
      setActive(false)
      window.location.reload()
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) return

    let success = true

    for (const branch of branches) {
      const url = BRANCH_URLS[branch]
      if (!url) continue

      try {
        const res = await fetch(`${url}/clients/stocks/${initial.id}/`, {
          method: 'DELETE'
        })

        if (res.status !== 204) {
          alert(`Ошибка при удалении в "${branch}"`)
          success = false
        }
      } catch (err) {
        console.error(`Ошибка при удалении в "${branch}":`, err)
        success = false
      }
    }

    if (success) {
      alert('Товар удалён во всех филиалах')
      setActive(false)
      window.location.reload()
    }
  }

  useEffect(() => {
    fetch(`https://auncrm.pythonanywhere.com/clients/categories/`)
      .then(res => res.json())
      .then(data => setCats(data))
      .catch(e => console.error('Не удалось загрузить категории', e))
  }, [])

  return (
    <div className={c.addExpense}>
      <div className={c.addExpense__header}>
        <h2>Изменение товара</h2>
      </div>

      {/* чекбоксы филиалов */}
      <div className={c.branchCheckboxes}>
        <h4>Филиалы</h4>
        <div className={c.checks}>
          {['Сокулук', 'Беловодское'].map(branch => (
            <label key={branch}>
              <input
                type="checkbox"
                checked={branches.includes(branch)}
                onChange={() => toggleBranch(branch)}
              />
              {branch}
            </label>
          ))}
        </div>
      </div>

      <div className={c.addExpense__form}>
        <div className={c.addExpense__form__item}>
          <label htmlFor="code">Код</label>
          <input
            id="code"
            value={code}
            placeholder="Код товара"
            onChange={e => setCode(e.target.value)}
          />
        </div>

        <div className={c.addExpense__form__item}>
          <label htmlFor="name">Наименование</label>
          <input
            id="name"
            value={name}
            placeholder="Введите наименование"
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className={c.addExpense__form__item}>
          <label htmlFor="cat">Категория</label>
          <select
            id="cat"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">‒ выберите ‒</option>
            {cats.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className={c.addExpense__form__item}>
          <label htmlFor="qty">Количество</label>
          <input
            id="qty"
            type="number"
            value={quantity}
            placeholder="0"
            onChange={e => setQuantity(e.target.value)}
          />
        </div>

        <div className={c.addExpense__form__item}>
          <label htmlFor="fqty">Фиксированное количество</label>
          <input
            id="fqty"
            type="number"
            value={fixedQuantity}
            placeholder="0"
            onChange={e => setFixedQuantity(e.target.value)}
          />
        </div>

        <div className={c.addExpense__form__item}>
          <label htmlFor="ps">Цена поставщика</label>
          <input
            id="ps"
            type="number"
            value={priceSeller}
            placeholder="0"
            onChange={e => setPriceSeller(e.target.value)}
          />
        </div>

        <div className={c.addExpense__form__item}>
          <label htmlFor="pr">Цена продажи</label>
          <input
            id="pr"
            type="number"
            value={price}
            placeholder="0"
            onChange={e => setPrice(e.target.value)}
          />
        </div>
      </div>

      <div className={c.res}>
        <button onClick={() => setActive(false)}>Отменить</button>
        <button onClick={handleSave}>
          <img src={Icons.addGreen} alt="" /> Сохранить
        </button>
        {initial.id && (
          <button onClick={handleDelete}>Удалить</button>
        )}
      </div>
    </div>
  )
}

export default EditStock