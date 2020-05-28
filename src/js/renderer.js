// const { ipcRenderer, remote, session } = eRequire('electron');
// const dialog = remote.dialog;
// const he = require('he');
// const fs = eRequire('fs');
// const os = eRequire('os');
// const sqlDb = eRequire('mssql');
const axios = eRequire('axios');
const _ = eRequire('lodash');
// const https = eRequire('https');

const moment = eRequire('moment');
require('moment/locale/pt-BR');

// const config = {
// 	user: 'sa',
// 	password: 'sa',
// 	server: '192.168.25.170\\sqlexpress',
// 	database: 'decoteped',
// 	port: '1433',
// 	connectionTimeout: 500000,
// 	requestTimeout: 500000,
// 	pool: {
// 		idleTimeoutMillis: 500000,
// 		max: 100,
// 	},
// 	encrypt: false,
// };

let todaysSales = 0.0,
	totalWeekSales = 0.0,
	totalMonthSales = 0.0,
	totalYearSales = 0;

$(function () {
	$('#todaysSalesDate').html(moment(new Date()).format('LL'));
	$('#totalWeekSalesDate').html(moment().startOf('week').format('DD') + ' a ' + moment().endOf('week').format('DD [de] MMMM YYYY'));
	$('#totalMonthSalesDate').html(moment().startOf('month').format('DD') + ' a ' + moment().endOf('month').format('DD [de] MMMM YYYY'));
	$('#totalYearSalesDate').html(moment().startOf('year').format('DD [de] MMMM') + ' a ' + moment().endOf('year').format('DD [de] MMMM YYYY'));

	$('#todaysSales').html(todaysSales.toFixed(2).replace('.', ','));
	$('#totalWeekSales').html(totalWeekSales.toFixed(2).replace('.', ','));
	$('#totalMonthSales').html(totalMonthSales.toFixed(2).replace('.', ','));
	$('#totalYearSales').html(totalYearSales.toFixed(2).replace('.', ','));
});

const getOrucTodaysSalesData = async () => {
	await axios
		.get('https://www.meudatacenter.com/api/v1/pedidos?status=pago', {
			headers: {
				'x-ID': '8721',
				'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
			},
		})
		.then((response) => {
			// console.log(response.data);

			if (response.data) {
				let sales = response.data.pedidos;

				todaysSales = 0;

				sales.forEach((sale) => {
					todaysSales = todaysSales + parseFloat(sale.valor_total);
				});

				$('todaysSales').html(todaysSales.toFixed(2).replace('.', ','));
			}
		})
		.catch(function (error) {
			// handle error
			console.log(error);
		});
};

const getOrucWeekSalesData = async () => {
	await axios
		.get(`https://www.meudatacenter.com/api/v1/pedidos?status=pago&dataInicial=${'2020-05-24'}&dataFinal=${'2020-05-30'}`, {
			headers: {
				'x-ID': '8721',
				'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
			},
		})
		.then((response) => {
			console.log(response.data);

			if (response.data) {
				let sales = response.data.pedidos;

				totalWeekSales = 0;

				sales.forEach((sale) => {
					totalWeekSales = totalWeekSales + parseFloat(sale.valor_total);
				});

				$('#totalWeekSales').html(totalWeekSales.toFixed(2).replace('.', ','));
			}
		})
		.catch(function (error) {
			// handle error
			console.log(error);
		});
};

const getOrucMonthSalesData = async () => {
	await axios
		.get(`https://www.meudatacenter.com/api/v1/pedidos?status=pago&dataInicial=${'2020-05-01'}&dataFinal=${'2020-05-31'}`, {
			headers: {
				'x-ID': '8721',
				'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
			},
		})
		.then((response) => {
			console.log(response.data);

			if (response.data) {
				let sales = response.data.pedidos;

				totalMonthSales = 0;

				sales.forEach((sale) => {
					totalMonthSales = totalMonthSales + parseFloat(sale.valor_total);
				});

				$('#totalWeekSales').html(totalWeekSales.toFixed(2).replace('.', ','));
			}
		})
		.catch(function (error) {
			// handle error
			console.log(error);
		});
};

const getOrucYearSalesData = async () => {
	await axios
		.get(`https://www.meudatacenter.com/api/v1/pedidos?dataInicial=${'2020-01-01'}&dataFinal=${'2020-12-31'}`, {
			headers: {
				'x-ID': '8721',
				'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
			},
		})
		.then((response) => {
			console.log(response.data);

			if (response.data) {
				let sales = response.data.pedidos;

				totalYearSales = 0;

				sales.forEach((sale) => {
					totalYearSales = totalYearSales + parseFloat(sale.valor_total);
				});

				$('#totalYearSales').html(totalYearSales.toFixed(2).replace('.', ','));
			}
		})
		.catch(function (error) {
			// handle error
			console.log(error);
		});
};

// const getOrucProductsData = async () => {

// 	await axios
// 		.get('https://www.meudatacenter.com/api/v1/produtos?page=1', {
// 			headers: {
// 				'x-ID': '8721',
// 				'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
// 			},
// 		})
// 		.then((response) => {
// 			console.log(response.data);
// 		})
// 		.catch(function (error) {
// 			// handle error
// 			console.log(error);
// 		});
// };

// getProductData();
// getSGIProductsData();
// getSGISales();
// getOrucSalesData();

setInterval(() => {
	getOrucTodaysSalesData();
	getOrucWeekSalesData();
	getOrucMonthSalesData();
	getOrucYearSalesData();
}, 60000);
