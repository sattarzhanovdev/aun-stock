import React from 'react';
import c from './workers.module.scss';
import { Icons } from '../../assets/icons';
import { API } from '../../api';
import { Components } from '..';
import Barcode from 'react-barcode';

const StockTable = () => {
  const [month, setMonth] = React.useState('');
  const [clients, setClients] = React.useState(null);
  const [active, setActive] = React.useState(false);
  const [editActive, setEditActive] = React.useState(false);
  const [selectedWeek, setSelectedWeek] = React.useState(5);
  const [categories, setCategories] = React.useState([]);
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [selectedBranch, setSelectedBranch] = React.useState('stock');

  const branchAPI = selectedBranch === 'sokuluk'
    ? 'https://auncrm.pythonanywhere.com'
    : 'https://auncrm2.pythonanywhere.com';

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  React.useEffect(() => {
    const monthName = currentDate.toLocaleString('ru', { month: 'long' });
    setMonth(monthName.charAt(0).toUpperCase() + monthName.slice(1));

    fetch(`${branchAPI}/clients/stocks/`)
      .then(res => res.json())
      .then(data => setClients(data.reverse()))
      .catch(err => console.error('Ошибка загрузки товаров:', err));
  }, [branchAPI]);

  React.useEffect(() => {
    fetch(`${branchAPI}/clients/categories/`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Ошибка загрузки категорий:', err));
  }, [branchAPI]);

  const getWeekNumber = (dateStr) => {
    const day = new Date(dateStr).getDate();
    if (day >= 1 && day <= 7) return 1;
    if (day >= 8 && day <= 14) return 2;
    if (day >= 15 && day <= 21) return 3;
    if (day >= 22) return 4;
    return null;
  };

  const filterGoods = () => {
    let filtered = clients;
    if (selectedWeek !== 5) {
      filtered = filtered?.filter(item =>
        getWeekNumber(item.appointment_date) === selectedWeek
      );
    }
    if (selectedCategory) {
      filtered = filtered?.filter(item => item.category === selectedCategory);
    }
    return filtered;
  };

  console.log(clients?.reduce((a, b) => a+Number(b.price*b.quantity), 0));
  

  return (
    <div className={c.workers}>
      {/* <div style={{ marginBottom: 20 }}>
        <label>Филиал:&nbsp;</label>
        <select
          value={selectedBranch}
          onChange={e => setSelectedBranch(e.target.value)}
          style={{ padding: 6 }}
        >
          <option value="stock" selected>Склад</option>
          <option value="sokuluk">Сокулук</option>
        </select>
      </div> */}

      <div className={c.table}>
        <select
          className={c.filteration}
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <option value="">‒ Все категории ‒</option>
          {categories && categories.map(item => (
            <option key={item.id} value={item.name}>{item.name}</option>
          ))}
        </select>

        <table>
          <thead>
            <tr>
              <th>_</th>
              <th>{filterGoods()?.length || 0} позиций</th>
              <th></th>
              <th>{filterGoods()?.reduce((a, b) => Number(a) + Number(b.fixed_quantity), 0)}</th>
              <th>{filterGoods()?.reduce((a, b) => Number(a) + Number(b.quantity), 0)}</th>
              <th>{filterGoods()?.reduce((a, b) => Number(a) + Number(b.price_seller * b.fixed_quantity), 0)} сом</th>
              <th>{filterGoods()?.reduce((a, b) => Number(a) + Number((b.price * b.fixed_quantity) - (b.price_seller * b.fixed_quantity)), 0)} сом</th>
              <th></th>
              <th></th>
            </tr>
            <tr>
              <th><img src={Icons.edit} alt="edit" /></th>
              <th>№</th>
              <th>Наименование</th>
              <th>Было добавлено</th>
              <th>Осталось</th>
              <th>Цена поставщика</th>
              <th>Цена продажи</th>
              <th>Штрих-код</th>
              <th>
                <button onClick={() => setActive(true)}>+ Добавить</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filterGoods()?.length > 0 ? (
              filterGoods().map((item, i) => (
                <tr key={item.id}
                    style={
                      Number(item.quantity) <= 200
                        ? { background: 'rgba(255, 0, 0, 0.3)' }
                        : Number(item.quantity) <= 300
                        ? { background: 'rgba(255, 255, 0, 0.3)' }
                        : {}
                    }>
                  <td>
                    <img
                      src={Icons.edit}
                      alt="edit"
                      onClick={() => {
                        localStorage.setItem('editStock', JSON.stringify(item));
                        setEditActive(true);
                      }}
                    />
                  </td>
                  <td>{i + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.fixed_quantity}</td>
                  <td>{item.quantity}</td>
                  <td>{item.price_seller}</td>
                  <td>{item.price}</td>
                  <td>
                    <Barcode
                      value={item.code.split(',')[0]}
                      width={0.6}
                      height={20}
                      fontSize={12}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9}>Товаров нет</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editActive && <Components.EditStock setActive={setEditActive} selectedBranch={selectedBranch} />}
      {active && <Components.AddStock setActive={setActive} selectedBranch={selectedBranch} />}
    </div>
  );
};

export default StockTable;