import RangePicker from './components/range-picker/src/index.js';
import SortableTable from './components/sortable-table/src/index.js';
import ColumnChart from './components/column-chart/src/index.js';
import header from './bestsellers-header.js';

import fetchJson from './utils/fetch-json.js';

const BACKEND_URL = 'https://course-js.javascript.ru/';

export default class Page {

	element;
	subElements = {};
	components = {};
	from = new Date(new Date().setMonth(new Date().getMonth() - 1));
	to = new Date();
	url = new URL('api/dashboard/bestsellers', BACKEND_URL)

	async updateComponents(from, to) {
		const data = await this.loadData(from, to);

		this.components.sortableTable.renderRows(data);

		this.components.ordersChart.update(from, to);
		this.components.salesChart.update(from, to);
		this.components.customersChart.update(from, to);
	}

	loadData(from, to) {
		this.url.searchParams.set('_start', '1');
		this.url.searchParams.set('_end', '21');
		this.url.searchParams.set('_sort', 'title');
		this.url.searchParams.set('_order', 'asc');
		this.url.searchParams.set('from', from.toISOString());
		this.url.searchParams.set('to', to.toISOString());

		return fetchJson(this.url);
	}

	initComponents() {
		const now = new Date();
		const to = new Date();
		const from = new Date(now.setMonth(now.getMonth() - 1));

		const rangePicker = new RangePicker({
			from,
			to,
		});

		const sortableTable = new SortableTable(header, {
			url: `api/dashboard/bestsellers?_start=1&_end=21&from=${from.toISOString()}&to=${to.toISOString()}&_sort=title&_order=asc`,
			isSortLocally: true,
			isOnwindowScroll: false
		});

		const ordersChart = new ColumnChart({
			url: 'api/dashboard/orders',
			range: {
				from,
				to,
			},
			label: 'orders',
			link: '#'
		});

		const salesChart = new ColumnChart({
			url: 'api/dashboard/sales',
			range: {
				from,
				to,
			},
			label: 'sales',
			formatHeading: data => `$${data}`
		});

		const customersChart = new ColumnChart({
			url: 'api/dashboard/customers',
			range: {
				from,
				to,
			},
			label: 'customers',
		});

		this.components = {
			rangePicker,
			sortableTable,
			ordersChart,
			salesChart,
			customersChart
		}
	}

	renderComponents() {
		Object.keys(this.components).forEach(componentName => {
			const root = this.subElements[componentName];
			const { element } = this.components[componentName];

			root.append(element);
		});
	}

	template() {
		return `
		<div class="dashboard">
			<div class="content__top-panel">
				<h2 class="page-title">Dashboard</h2>
				<div data-element="rangePicker"></div>
			</div>
			<div data-element="chartsRoot" class="dashboard__charts">
				<div data-element="ordersChart" class="dashboard__chart_orders"></div>
				<div data-element="salesChart" class="dashboard__chart_sales"></div>
				<div data-element="customersChart" class="dashboard__chart_customers"></div>
			</div>
      	<h3 class="block-title">Best sellers</h3>
			<div data-element="sortableTable">
			</div>
   	</div>
	`;
	}

	getSubElements() {
		const result = {};

		const subElements = this.element.querySelectorAll('[data-element]');

		for (const subElement of subElements) {
			result[subElement.dataset.element] = subElement;
		}

		return [...subElements].reduce((accum, subElement) => {
			accum[subElement.dataset.element] = subElement;

			return accum;
		}, {});
	}

	render() {
		const wrapper = document.createElement('div');

		wrapper.innerHTML = this.template();

		this.element = wrapper.firstElementChild;

		this.subElements = this.getSubElements();

		this.initComponents();
		this.renderComponents();
		this.initEventListeners();
		return this.element;
	}

	initEventListeners() {
		this.components.rangePicker.element.addEventListener('date-select', event => {
			const { from, to } = event.detail;

			this.updateComponents(from, to);
		});
	}

	remove() {
		if (this.element) {
			this.element.remove();
		}
	}

	destroy() {
		this.remove();
		this.element = null;
		this.subElements = null;
	}
}
