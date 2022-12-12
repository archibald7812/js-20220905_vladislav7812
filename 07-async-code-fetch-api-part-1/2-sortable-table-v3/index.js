import fetchJson from './utils/fetch-json.js';

const BACKEND_URL = 'https://course-js.javascript.ru';

export default class SortableTable {

	data = [];
	element;
	subElements = {};
	loading = false;
	step = 20;
	start = 0;
	end = this.start + this.step;


	constructor(headersConfig, {
		sorted = {
			orderValue: 'asc',
			fieldValue: headersConfig.find(item => item.sortable).id
		},
		isSortLocally = false,
		url
	} = {}) {
		this.url = url;
		this.headerConfig = headersConfig;
		this.isSortLocally = isSortLocally;
		this.sorted = sorted;
		this.render();
	}

	getDataId(config) {
		const id = config['id'];
		return id ? `data-id='${id}'` : '';
	}

	getDataSortable(config) {
		const sortable = config['sortable'];
		return sortable ? `data-sortable='${sortable}'` : '';
	}

	getTitle(config) {
		const title = config['title'];
		return title ? `${title}` : '';
	}

	getDataOrders(config) {
		const order = config['order'];
		return order ? `data-order='${order}'` : 'data-order="asc"';
	}

	getHeaderRow() {
		return `
	  <div data-element="header" class="sortable-table__header sortable-table__row">
	  ${this.getHeaderCell()}
	  </div>
	  `;
	}

	getHeaderCell() {
		return this.headerConfig
			.map((config) => {
				return `
		 <div class="sortable-table__cell" ${this.getDataId(config)} ${this.getDataSortable(config)} 
		 ${this.getDataOrders(config)}>
			<span>${this.getTitle(config)}</span>
		 </div>
		 `;
			}
			)
			.join('');
	}

	getArrow() {
		const arrow = document.createElement('div');
		arrow.innerHTML = `
	  <span data-element="arrow" class="sortable-table__sort-arrow">
		 <span class="sort-arrow"></span>
	  </span > `;
		return arrow.firstElementChild;
	}

	getBody() {
		return `
	  <div data-element="body" class="sortable-table__body">
		 ${this.getBodyRows(this.data)}
	  </div>
	  `;
	}

	getBodyRows(data = []) {
		return data
			.map((item) => {
				return `
			<a href = "/products/${item.id}" class="sortable-table__row">
			  ${this.getBodyRow(item)}
			</a>
			  `;
			}
			)
			.join('');
	}

	getBodyRow(data) {
		const bodyCell = this.headerConfig.map(({ id, template }) => {
			return {
				id,
				template
			};
		});
		return bodyCell
			.map(({ id, template }) => {
				return template ?
					template(data[id]) :
					`<div class="sortable-table__cell" > ${data[id]}</div> `;
			})
			.join('');
	}

	getTemplate() {
		return `
	  <div data-element="productsContainer" class="products-list__container">
		 <div class="sortable-table">
			${this.getHeaderRow()}
			${this.getBody()}
		 </div>
	  </div >
	  `;
	}

	getSubElements(element) {
		const result = {};
		const elements = element.querySelectorAll('[data-element]');
		result.arrow = this.getArrow();
		for (const subElement of elements) {

			const name = subElement.dataset.element;

			result[name] = subElement;
		}
		return result;
	}

	scroll = async (event) => {
		const { bottom } = this.element.getBoundingClientRect();
		const { id, order } = this.sorted;

		if (bottom < document.documentElement.clientHeight && !this.loading && !this.isSortLocally) {
			this.start = this.end;
			this.end = this.start + this.step;
			this.loading = true;
			const data = await this.getData({ id, order });
			this.subElements.body.innerHTML += this.getBodyRows(data);
			this.loading = false;
		}

	}

	async getData({ id, order } = {}) {
		const response = await fetchJson(this.getURL({ id, order }));

		const data = Object.values(response);
		return data;
	}

	renderBody() {
		const arrow = document.querySelector('.sortable-table__cell[data-id="title"]');
		arrow.append(this.subElements.arrow);
		this.subElements.body.innerHTML = this.getBodyRows(this.data);
	}

	sortOnClient(fieldValue, orderValue) {
		const sortedData = this.sortData({ fieldValue, orderValue });

		this.subElements.body.innerHTML = this.getBodyRows(sortedData);
	}

	async sortOnServer(id, order) {
		const url = this.getURL({
			start: 0,
			end: 20,
			sort: id,
			order: order
		});

		const sortedData = await fetchJson(url);

		this.subElements.body.innerHTML = this.getBodyRows(sortedData);
	}

	getURL(data = {}) {
		const { start = this.start, end = this.end, id = 'title', order = 'asc' } = data;
		const url = new URL(this.url, BACKEND_URL);
		url.searchParams.set('_embed', 'subcategory.category');
		url.searchParams.set('_sort', id);
		url.searchParams.set('_order', order);
		url.searchParams.set('_start', start);
		url.searchParams.set('_end', end);

		return url;
	}

	sortOnClick = (event) => {
		let sortDirection = '';
		let target = event.target.closest('[data-sortable]');
		switch (target.dataset.order) {
			case 'asc':
				sortDirection = 'desc';
				break;
			case 'desc':
				sortDirection = 'asc';
				break;
			default:
				sortDirection = 'desc';
		}

		const arrow = target.querySelector('.sortable-table__sort-arrow');

		if (!arrow) {
			target.append(this.subElements.arrow);
		}

		target.dataset.order = sortDirection;

		if (this.isSortLocally) {
			this.sortOnClient(target.dataset.id, sortDirection);
		} else {
			this.sortOnServer(target.dataset.id, sortDirection);
		}

		this.sorted.orderValue = sortDirection;
		this.sorted.fieldValue = target.dataset.id;
	}

	sortData({ fieldValue, orderValue }) {
		const array = [...this.data];
		const column = this.headerConfig.find(item => item.id === fieldValue);
		const { sortType } = column;

		const directions = {
			asc: 1,
			desc: -1,
		};

		const direction = directions[orderValue];

		return array.sort((a, b) => {
			switch (sortType) {
				case 'number':
					return direction * (a[fieldValue] - b[fieldValue]);
				case 'string':
					return direction * (a[fieldValue].localeCompare(b[fieldValue], ['ru', 'en']));
				default:
					return direction * (a[fieldValue] - b[fieldValue]);
			}
		});
	}

	setEventListeners() {
		this.subElements.header.addEventListener('mousedown', this.sortOnClick);

		window.addEventListener('scroll', this.scroll);
	}

	async render() {
		const wrapper = document.createElement('div');

		wrapper.innerHTML = this.getTemplate();

		const element = wrapper.firstElementChild;

		this.element = element;

		this.subElements = this.getSubElements(element);

		this.data = await this.getData();

		this.renderBody();

		this.setEventListeners();

	}

	remove() {
		if (this.element) {
			this.element.remove();
		}
	}

	destroy() {
		this.remove();
		this.subElements = {};
		this.element = null;

		window.removeEventListener('scroll', this.scroll);
	}
}