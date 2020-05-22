// const { ipcRenderer, remote, session } = eRequire('electron');
// const dialog = remote.dialog;
const he = require('he');
// const fs = eRequire('fs');
// const os = eRequire('os');
const sqlDb = eRequire('mssql');
const axios = eRequire('axios');
const _ = eRequire('lodash');
const https = eRequire('https');

const moment = eRequire('moment');
require('moment/locale/pt-BR');

const config = {
	user: 'sa',
	password: 'sa',
	server: '192.168.25.170\\sqlexpress',
	database: 'decoteped',
	port: '1433',
	connectionTimeout: 500000,
	requestTimeout: 500000,
	pool: {
		idleTimeoutMillis: 500000,
		max: 100,
	},
	encrypt: false,
};

let todaysSales = 0.0,
	totalWeekSales = 0.0,
	totalMonthSales = 0.0,
	totalYearSales = 0;

$(function () {
	// var hash = location.hash;
	// var target = hash.length > 0 ? hash.substr(1) : 'dashboard';
	// // var link = $('.navview-menu a[href*=' + target + ']');
	// // var menu = link.closest('ul[data-role=dropdown]');
	// // var node = link.parent('li').addClass('active');

	// function getContent(target) {
	// 	window.on_page_functions = [];
	// 	$.get('' + target + '.html').then(function (response) {
	// 		$('#content-wrapper').html(response);

	// 		window.on_page_functions.forEach(function (func) {
	// 			Metro.utils.exec(func, []);
	// 		});

	// 		$('#buttonExportProducts').click((e) => {
	// 			exportData();
	// 		});
	// 	});
	// }

	// getContent(target);

	// moment().startOf('week').toDate();
	// moment().endOf('week').toDate();

	$('#todaysSalesDate').html(moment(new Date()).format('LL'));
	$('#totalWeekSalesDate').html(moment().startOf('week').format('DD') + ' a ' + moment().endOf('week').format('DD [de] MMMM YYYY'));
	$('#totalMonthSalesDate').html(moment().startOf('month').format('DD') + ' a ' + moment().endOf('month').format('DD [de] MMMM YYYY'));
	$('#totalYearSalesDate').html(moment().startOf('year').format('DD [de] MMMM') + ' a ' + moment().endOf('year').format('DD [de] MMMM YYYY'));

	$('#todaysSales').html(todaysSales.toFixed(2).replace('.', ','));
	$('#totalWeekSales').html(totalWeekSales.toFixed(2).replace('.', ','));
	$('#totalMonthSales').html(totalMonthSales.toFixed(2).replace('.', ','));
	$('#totalYearSales').html(totalYearSales.toFixed(2).replace('.', ','));
});

const getSGIProductsData = () => {
	new sqlDb.ConnectionPool(config)
		.connect()
		.then((pool) => {
			pool.request()
				.query(
					`select top 10 p.codigo, 
						p.nome, 
						p.desc_compl,
						p.preco,
						isnull(p.comprimento, 0) as comprimento,
						isnull(p.largura, 0) as largura,
						isnull(p.altura, 0) as altura,
						p.peso,
						isnull(f.nome, '') as fabricante,
						p.cod_barras,
						gru.nome as grupo_nome, 
						isnull(ig.nome, '') as grade, 
						isnull(gra.nome, '') as nome_grade, 
						isnull(ige.estoque, 0) as estoque, 
						isnull((cast(p.codigo as varchar) + isnull(dbo.zeroesquerda(ige.codi_item_grade, 3), '') + isnull(dbo.zeroesquerda(ige.codi_grade, 3), '')), p.codigo) as id
					from produto p
					left join fabricante f on p.fabricante = f.codigo
					left join grupo gru on gru.codigo = p.grupo
					left join itens_grade_estoque ige on ige.produto = p.codigo
					left join grades gra on gra.codigo = ige.codi_grade
					left join itens_grade ig on ig.codigo = ige.codi_item_grade
					where p.exportado = 0
					order by p.codigo; `
				)
				.then((data) => {
					// console.log('Data: ', data.recordsets[0]);

					let products = [];
					let product = {};
					_.forEach(data.recordsets[0], (item, index) => {
						const match = products.some((obj) => parseInt(obj.codigo) === item.codigo);

						if (match) {
							product.modelos[0].itens.push({
								nome_opcao: he.encode(item.nome_grade || '', {
									useNamedReferences: true,
								}),
								referencia: parseInt(item.id),
								estoque: item.estoque,
								ean: item.cod_barras ? (item.cod_barras.length > 6 ? item.cod_barras : '') : '',
							});
						} else {
							product = {
								nome: he.encode(item.nome, {
									useNamedReferences: true,
								}),
								codigo: `${item.codigo}`,
								descricao: he.encode(item.desc_compl || '', {
									useNamedReferences: true,
								}),
								departamento: he.encode(item.grupo_nome || '', {
									useNamedReferences: true,
								}),
								fabricante: he.encode(item.fabricante, {
									useNamedReferences: true,
								}),
								preco: item.preco,
								custo: 0,
								comprimento: item.comprimento || 0,
								largura: item.largura || 0,
								altura: item.altura || 0,
								peso: item.peso || 1.0,
								cubagem: 0,
								garantia: '',
								modelos: [
									{
										nome: '',
										crossdocking: 10,
										imagens:
											'https://res.cloudinary.com/agf2000/image/upload/v1588456369/samples/food/spices.jpg,https://res.cloudinary.com/agf2000/image/upload/v1588456368/samples/ecommerce/leather-bag-gray.jpg',
										status: 1,
										itens: [
											{
												nome_opcao: he.encode(item.nome_grade || '', {
													useNamedReferences: true,
												}),
												referencia: parseInt(item.id),
												estoque: 10, //  item.estoque,
												ean: item.cod_barras ? (item.cod_barras.length > 6 ? item.cod_barras : '') : '',
											},
										],
									},
								],
							};
						}

						if (!match) {
							products.push(product);
						}
					});

					products.forEach((prod) => {
						const productsData = JSON.stringify(prod);

						const productsPostOptions = {
							hostname: 'www.meudatacenter.com',
							port: 443,
							path: '/api/v1/produto',
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'Content-Length': productsData.length,
								'x-ID': '8721',
								'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
							},
						};

						const req = https.request(productsPostOptions, (res) => {
							console.log(`statusCode: ${res.statusCode}`);
							console.log(`statusMessage: ${res.statusMessage}`);
							// res.on('data', (d) => {
							// 	process.stdout.write(d);
							// 	// console.log(d);
							// });
						});

						req.on('error', (error) => {
							console.error(error);
						});

						req.write(productsData);

						req.end();
					});

					console.log('Data: ', products);
				})
				.catch((err) => {
					console.log('Error B1:', err);
				});
		})
		.catch((err) => {
			console.log('Error B2:', err);
		});
};

const getSGISales = () => {
	new sqlDb.ConnectionPool(config)
		.connect()
		.then((pool) => {
			pool.request()
				.query(`select * from saida_principal where statuspedidoweb <> 'NOVO'; `)
				.then((data) => {
					if (data.recordsets[0].length) {
						console.log('Sales: ', data.recordsets[0]);

						let sales = 'data.recordsets[0];';

						sales.forEach((sale) => {
							// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/pago
							// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/separacao
							// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/entrega
							// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/concluido
							// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/cancelado

							const saleData = JSON.stringify(sale);

							const salePostOptions = {
								hostname: 'www.meudatacenter.com',
								port: 443,
								path: `/api/v1/pedido/${sale.campolivre1}/${sale.statuspedidoweb.toLowerCase()}`,
								method: 'PUT',
								headers: {
									'Content-Type': 'application/json',
									'Content-Length': saleData.length,
									'x-ID': '8721',
									'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
								},
							};

							const req = https.request(salePostOptions, (res) => {
								console.log(`statusCode: ${res.statusCode}`);
								console.log(`statusMessage: ${res.statusMessage}`);
								// res.on('data', (d) => {
								// 	process.stdout.write(d);
								// 	// console.log(d);
								// });
							});

							req.on('error', (error) => {
								console.error(error);
							});

							req.write(saleData);

							req.end();
						});
					}
				})
				.catch((err) => {
					console.log('SQL Error:', err);
				});
		})
		.catch((err) => {
			console.log('SQL Connection Error:', err);
		});
};

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

const getOrucSalesData = async () => {
	await axios
		.get('https://www.meudatacenter.com/api/v1/pedidos?status=novo', {
			headers: {
				'x-ID': '8721',
				'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
			},
		})
		.then((response) => {
			console.log(response.data);

			if (response.data) {
				let sales = response.data.pedidos;

				let sqlInst = '';

				sqlInst += 'begin try ';
				sqlInst += 'begin tran ';

				sales.forEach((sale) => {
					let client = sale.cliente,
						items = sale.itens,
						totalSales = 0.0;

					sqlInst += `declare @numDoc int, @clientId int, @postalCodeId int, @personTypeId int, @phoneType int, 
							@cityId int, @districtId int, @streetId int, @streetTypeId int, @countryId int,
							@cfop varchar(4), @hipId int, @salesPersonId int, @stateBusiness varchar(2), @stateDif int; `;

					sqlInst += `set @stateBusiness = (select isnull((select top 1 estado from cep where codigo = empresa.cep), '') from  empresa); `;

					sqlInst += `if (@stateBusiness = '') or ('${client.estado}' = '') set @stateDif = 2
							else
							if (@stateBusiness = '${client.estado}' ) and not (@stateBusiness = '' ) and not (@stateBusiness = '' ) set @stateDif = 0
							else
							if not (@stateBusiness = '${client.estado}' ) and not (@stateBusiness = '' ) and not ('${client.estado}' = '' ) set @stateDif = 1
							else
							set @stateDif = 2 `;

					if (client) {
						sqlInst += `if not exists(select top 1 1 from cidade where codigoibge = '${client.codigo_ibge}')
								begin
									insert into cidade (nome, estado, situacao, data_cadastro, codigoibge) values
									('${client.cidade}', '${client.estado}', 1, getdate(), '${client.codigo_ibge}');
									set @cityId = @@identity;
								end else begin
									set @cityId = (select top 1 codigo from cidade where codigoibge = '${client.codigo_ibge}');
								end; `;

						sqlInst += `if not exists(select top 1 1 from bairro where nome = '${client.bairro}')
								begin
									insert into bairro (nome, data_cadastro) values
									('${client.bairro}', getdate());
									set @districtId = @@identity;
								end else begin
									set @districtId = (select top 1 codigo from bairro where nome = '${client.bairro}');
								end; `;

						sqlInst += `if not exists(select top 1 1 from tipologradouro where nome = '${client.endereco.split(' ')[0]}')
								begin
									insert into tipologradouro (nome, data_cadastro) values
									('${client.endereco.split(' ')[0]}', getdate());
									set @streetTypeId = @@identity;
								end else begin
									set @streetTypeId = (select top 1 codigo from tipologradouro where nome = '${client.endereco.split(' ')[0]}');
								end; `;

						sqlInst += `if not exists(select top 1 1 from logradouro where nome = '${client.endereco.substr(client.endereco.indexOf(' ') + 1)}')
								begin
									insert into logradouro (nome, data_cadastro) values
									('${client.endereco.substr(client.endereco.indexOf(' ') + 1)}', getdate());
									set @streetId = @@identity;
								end else begin
									set @streetId = (select top 1 codigo from logradouro where nome = '${client.endereco.substr(client.endereco.indexOf(' ') + 1)}');
								end; `;

						sqlInst += `if not exists(select top 1 1 from cadpais where nomepais = 'BRASIL')
								begin
									insert into cadpais (nomepais, data_cadastro) values
									('BRASIL', getdate());
									set @countryId = @@identity;
								end else begin
									set @countryId = (select top 1 codigopais from cadpais where nomepais = 'BRASIL');
								end; `;

						sqlInst += `if not exists(select top 1 1 from cep where numero = '${client.cep.replace(/\D/g, '')}')
								begin
									insert into cep (numero, estado, cidade, bairro, codigopais, tipo_logradouro
										,logradouro,data_cadastro) values (
										'${client.cep}',
										'${client.estado}'
										,@cityId
										,@districtId
										,@countryId
										,@streetTypeId
										,@streetId
										,getdate());
									set @postalCodeId = @@identity; 
								end else begin 									
									set @postalCodeId = (select top 1 codigo from cep where numero = '${client.cep.replace(/\D/g, '')}'); 
								end; `;

						let personType = client.tipo_conta == 'PF' ? 'F' : 'J';

						sqlInst += `if not exists(select top 1 1 from pessoas where cpf_cnpj = '${client.doc}')
								begin
									insert into pessoas (nome, fantasia, natureza, cep, email, ativo, numero,
										complemento, tipo, cpf_cnpj, nascimento) values ('${client.nome}', '${client.nome}', '${personType}', 
										@postalCodeId, '${client.email}', 1, '${client.numero}', '${client.complemento}', 1, '${client.doc}', 
										'${moment(new Date(client.data_nascimento.substr(0, 4), client.data_nascimento.substr(5, 2), client.data_nascimento.substr(8, 2))).format('DD/MM/YYYY')}'); 
									set @clientId = @@identity;
								end
								else begin
									update pessoas set nome = '${client.nome}', fantasia = '${client.nome}',
										numero = '${client.numero}', complemento = '${client.complemento}',
										email = '${client.email}', cep = @postalCodeId
									where cpf_cnpj = '${client.doc}';
									set @clientId = (select top 1 codigo from cliente where cpf_cnpj = '${client.doc}') 
								end; `;

						if (client.telefone !== '') {
							let phoneType = '';
							switch (true) {
								case client.telefone.replace(/\D/g, '').substring(2).startsWith('9'):
									phoneType = 'Celular';
									break;
								default:
									phoneType = 'Fixo';
									break;
							}

							sqlInst += `if not exists(select top 1 1 from tipotelefone where nome = '${phoneType}') 
										begin 
											insert into tipotelefone (nome, data_cadastro) values ('${phoneType}', getdate()); 
											set @phoneType = @@identity; 
										end else begin 
											set @phoneType = (select top 1 nome from tipotelefone where nome = '${phoneType}'); 
										end; `;

							sqlInst += `if not exists(select top 1 1 from telefone where telefone = '${client.telefone.replace(/\D/g, '')}')
										begin
											insert into telefone (pessoa, tipo, telefone, contato, padrao, data_cadastro) values (
											@clientId, '${phoneType}', '${client.telefone}', '${client.nome.split(' ')[0]}', 1, getdate()); 
										end else begin 
											update telefone set pessoa = @clientId, tipo = '${phoneType}', telefone = '${client.telefone}',
												contato = '${client.nome.split(' ')[0]}' where pessoa = @clientId; 
										end; `;
						}
					}

					sqlInst += `set @cfop = (select top 1 isnull(cfop_dav, '5102') from parametros_sistema); 

          				set @hipId = isnull((select top 1 recvendas from paramcaixa), 0); 

						insert into saida_principal (
							codicli,
							cfop,
							codiven,
							dataemi,
							valordin,
							vrcartao,
							vrcred,
							vrconv,
							valor_total_prod,
							valor_total_serv,
							valor_total_nota,
							outrosdescontos,
							numcaixa,
							numerodav,
							dados_adicionais,
							cod_ope,
							idpedido,
							nfe_infcpl,
							codoperadoracred,
							campolivre1,
							campolivre2,
							campolivre3,
							campolivre4,
							cod_terceiro,
							outrosacrescimos,
							vrentrada,
							cpfcnpjclientebalcao,
							vrtotdesonerado,
							destacarimpostos)
						values (
							@clientId,
							@cfop,
							@salesPersonId,
							'${moment(new Date(sale.data_pedido.substr(0, 4), sale.data_pedido.substr(5, 2), sale.data_pedido.substr(8, 2))).format('DD/MM/YYYY')}',
							0,
							'${sale.valor_total_credito}',
							0,
							0,
							'${sale.valor_total}',
							0,
							'${sale.valor_total}',
							'${sale.valor_desconto}',
							1,
							0,
							'${sale.observacao_cliente}',
							null,
							null,
							(select top 1 msgpadrao from parametros_sistema),
							null,
							'${sale.codigo}',
							null,
							null,
							null,
							null,
							null,
							0,
							null,
							0,
							(select top 1 1 from empresa where isnull(simples,0) = 0  and (lucroreal = 1 or lucropresumido = 1)));

						set @numdoc = @@identity; `;

					if (items) {
						items.forEach((item) => {
							let productId = item.referencia.slice(0, -6),
								gradeInfo = item.referencia.substring(item.referencia.length - 6);

							sqlInst += `insert  into saidaitens (
								numdoc,
								codipro,
								qtsaida,
								valor_unitario,
								descpro,
								valor_total_liq,
								valor_total_bruto,
								cfop,
								unidade,
								prevproxcompra,
								campolivre1,
								campolivre2,
								campolivre3,
								cst,
								valoraproximpitem,
								complemento,
								vicmsdeson,
								vbcufdest,
								picmsinter,
								icms,
								picmsufdest,
								motdesicms,
								predbc,
								altura,largura,comprimento
								)
							values (
								@numDoc,
								'${productId}',
								'${item.quantidade}',
								'${item.valor / item.quantidade}',
								'${item.desconto}',
								'${item.valor - item.desconto}',
								'${item.valor}',
								(case @stateDif
										when 0
											then (
													select top 1 (case
															when isnull(t.cfop_saida_estado, '') = ''
																then @cfop
															else t.cfop_saida_estado
															end)
													from produto p
														,trib_ecf t
													where p.cod_trib_ecf = t.codigo
														and p.codigo = '${productId}'
													)
										when 1
											then (
													select top 1 case
															when isnull(t.cfop_saida_fora_estado, '') = ''
																then @cfop
															else t.cfop_saida_fora_estado
															end
													from produto p
														,trib_ecf t
													where p.cod_trib_ecf = t.codigo
														and p.codigo = '${productId}'
													)
										when 2
											then @cfop
										else @cfop
										end
									)
								,
								(select isnull(sigla, 'UNID') from unidade where codigo = (select isnull(unidade, 'UNID') from produto where codigo = '${productId}')),
								null,
								null,
								null,
								null,
								(select cast(isnull(cst, '') as varchar) from produto where codigo = '${productId}'),
								(${item.valor / item.quantidade}) * 0.3,
								null,
								0,
								0,
								0,
								(select icms from produto where codigo = '${productId}'),
								0,
								null,
								0,
								(select isnull(altura, 0) from produto where codigo = '${productId}'),
								(select isnull(largura, 0) from produto where codigo = '${productId}'),
								(select isnull(comprimento, 0) from produto where codigo = '${productId}')); `;

							if (gradeInfo) {
								let item_grade = gradeInfo.slice(0, -3),
									grade = gradeInfo.substring(gradeInfo.length - 3);

								sqlInst += `update itens_grade_estoque set estoque = estoque - ${item.quantidade} 
											where produto = '${productId}' and codi_item_grade = ${parseInt(item_grade)} 
											and codi_grade = ${parseInt(grade)}; `;
							}
						});
					}

					totalSales = totalSales + item.valor / item.quantidade;
				});

				sqlInst += 'commit tran ';
				sqlInst += 'end try ';
				sqlInst += 'begin catch ';
				sqlInst += 'rollback tran ';
				sqlInst += 'select error_message() as Error; ';
				sqlInst += 'end catch; ';

				// console.log(sqlInst);

				sqlDb.connect(config).then((pool) => {
					pool.request()
						.query(sqlInst)
						.then((result) => {
							// console.log(result);
							sqlDb.close();
							if (syncNewItems) {
								getItemsSync($btn, infoBox);
							} else {
								endProductsSync(infoBox);
								$('#divSyncTile').next().next().addClass('disabled selected');
							}
						})
						.catch((err) => {
							sqlError(err, infoBox);
						});
				});
			}
		})
		.catch(function (error) {
			// handle error
			console.log(error);
		});
};

const getOrucProductsData = async () => {
	await axios
		.get('https://www.meudatacenter.com/api/v1/produtos?page=1', {
			headers: {
				'x-ID': '8721',
				'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
			},
		})
		.then((response) => {
			console.log(response.data);
		})
		.catch(function (error) {
			// handle error
			console.log(error);
		});
};

// getProductData();
// getSGIProductsData();
getSGISales();
// getOrucSalesData();

setInterval(() => {
	getOrucTodaysSalesData();
	getOrucWeekSalesData();
	getOrucMonthSalesData();
	getOrucYearSalesData();
}, 15000);
