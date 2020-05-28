// const { ipcRenderer, remote, session } = eRequire('electron');
// const dialog = remote.dialog;
const sqlDb = require('mssql');
const axios = require('axios');
const https = require('https');
const he = require('he');
const fse = require('fs-extra');
const storage = require('electron-json-storage');

const log = require('electron-log');
log.info('API services loaded...');

const moment = require('moment');
require('moment/locale/pt-BR');

const db = require('../config/dbConfig');

let destPath = 'c:\\softer\\Oruc';
if (!fse.existsSync(destPath)) {
	fse.mkdirSync(destPath);
}

storage.setDataPath(destPath);
const lastSyncFileInfo = `${destPath}\\lastSync.txt`;
let lastSync = '';

fse.readFile(lastSyncFileInfo, function (err, data) {
	if (err) {
		log.info('Date saved on file');
		fse.writeFileSync(lastSyncFileInfo, new Date(), 'utf-8');
		return console.log(err);
	}

	lastSync = fse.readFileSync(lastSyncFileInfo, 'utf8');
	log.info(`Date on file ${lastSync}`);
});

const getSGISales = () => {
	const result = new Promise((resolve, reject) => {
		new sqlDb.ConnectionPool(db.config)
			.connect()
			.then((pool) => {
				pool.request()
					.query(`select * from saida_principal where statuspedidoweb <> 'NOVO'; `)
					.then((data) => {
						// log.info(`Sales: ${data.recordsets[0]}`);
						// console.log('Sales: ', data.recordsets[0]);

						let sales = data.recordsets[0].length;

						if (sales) {
							// let sales = 'data.recordsets[0];';

							data.recordsets[0].forEach((sale) => {
								// 	// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/pago
								// 	// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/separacao
								// 	// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/entrega
								// 	// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/concluido
								// 	// - PUT https://www.meudatacenter.com/api/v1/pedido/{ID}/cancelado

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
									log.info(`statusCode: ${res.statusCode}`);
									log.info(`statusMessage: ${res.statusMessage}`);
									// console.log(`statusCode: ${res.statusCode}`);
									// console.log(`statusMessage: ${res.statusMessage}`);
									resolve('success');
									// res.on('data', (d) => {
									// 	process.stdout.write(d);
									// 	// console.log(d);
									// });
								});

								req.on('error', (error) => {
									log.error(error);
									// console.error(error);
									reject(error);
								});

								req.write(saleData);

								req.end();

								sales = sales - 1;

								if (sales == 0) {
									// log.info(`Got here ${sales}`);
									resolve('success');
								}
							});
						} else {
							// log.info('Finished');
							resolve('success');
						}
					})
					.catch((err) => {
						log.error(err);
						// console.log('SQL Error:', err);
						reject(err);
					});
			})
			.catch((err) => {
				log.error(err);
				// console.log('SQL Connection Error:', err);
				reject(err);
			});
	});

	// log.info(result);

	return result;
};

const getOrucSalesData = () => {
	const result = new Promise((resolve, reject) => {
		axios
			.get('https://www.meudatacenter.com/api/v1/pedidos?status=novo', {
				headers: {
					'x-ID': '8721',
					'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
				},
			})
			.then((response) => {
				// console.log(response.data);

				if (response.data) {
					let sales = response.data.pedidos;

					let sqlInst = '';

					sqlInst += 'begin try ';
					sqlInst += 'begin tran ';

					if (sales.length == 0) log.info('There are no new sales.');

					sales.forEach((sale) => {
						let client = sale.cliente,
							items = sale.itens;

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
								let productId = item.referencia.slice(0, -5),
									gradeInfo = item.referencia.substring(item.referencia.length - 5);

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
					});

					sqlInst += 'commit tran ';
					sqlInst += 'end try ';
					sqlInst += 'begin catch ';
					sqlInst += 'rollback tran ';
					sqlInst += 'select error_message() as Error; ';
					sqlInst += 'end catch; ';

					// console.log(sqlInst);

					sqlDb.connect(db.config).then((pool) => {
						pool.request()
							.query(sqlInst)
							.then((result) => {
								// console.log(result);
								sqlDb.close();
								resolve('success');
							})
							.catch((err) => {
								sqlError(err, infoBox);
								reject(error);
							});
					});
				}
			})
			.catch(function (error) {
				// handle error
				// console.log(error);
				log.error(err);
				reject(error);
			});
	});

	// log.info(result);

	return result;
};

const getSGINewProductsData = () => {
	const result = new Promise((resolve, reject) => {
		let sqlInst = `select top 10 
				p.codigo,
				p.nome,
				p.desc_compl,
				p.preco,
				isnull(p.comprimento, 0) as comprimento,
				isnull(p.largura, 0) as largura,
				isnull(p.altura, 0) as altura,
				p.peso,
				isnull(f.nome, '') as fabricante,
				p.cod_barras,
				isnull(ige.codi_item_grade, 0) as codi_item_grade,
				isnull(ige.codi_grade, 0) as codi_grade,
				gru.nome as grupo_nome,
				isnull(ig.nome, '') as grade,
				isnull(gra.nome, '') as nome_grade,
				(case when isnull(ige.produto, 0) <> 0 then isnull(ige.estoque, 0) else isnull(p.estoque, 0) end) as estoque, 
				isnull((cast(p.codigo as varchar) + isnull(dbo.zeroesquerda(ige.codi_item_grade, 2), '') + isnull(dbo.zeroesquerda(ige.codi_grade, 3), '')), p.codigo) as id
			from produto p
			left join fabricante f on p.fabricante = f.codigo
			inner join grupo gru on gru.codigo = p.grupo
			left join itens_grade_estoque ige on ige.produto = p.codigo
			left join grades gra on gra.codigo = ige.codi_grade
			left join itens_grade ig on ig.codigo = ige.codi_item_grade
			where isnull(p.exportado, 0) = 0
			order by p.codigo;`;
		new sqlDb.ConnectionPool(db.config)
			.connect()
			.then((pool) => {
				pool.request()
					.query(sqlInst)
					.then((data) => {
						// console.log('Data: ', data.recordsets[0]);
						// log.info(`Products count: ${productsCount}`);

						let products = [];
						let product = {};
						if (data.recordsets[0].length) {
							log.info(`${data.recordsets[0].length} new products.`);
							data.recordsets[0].forEach((item, index) => {
								// log.info(`Product index: ${index}`);

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

							let productsCount = products.length;

							products.forEach((prod, index) => {
								// log.info(`Got here ${index}`);

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
									log.info(`statusCode: ${res.statusCode}`);
									log.info(`statusMessage: ${res.statusMessage}`);
									// console.log(`statusCode: ${res.statusCode}`);
									// console.log(`statusMessage: ${res.statusMessage}`);

									sqlDb
										.connect(db.config)
										.then((pool) => {
											let sqlInstUpdate = '';
											// if (prod.codi_grade) {
											// 	sqlInstUpdate += `update itens_grade_estoque set ref = ${prod.id} where produto = ${prod.codigo} and codi_item_grade = ${prod.codi_item_grade} and codi_grade = ${prod.codi_grade}`;
											// } else {
											sqlInstUpdate += `update produto set exportado = 1 where codigo = ${prod.codigo}`;
											// }

											pool.request()
												.query(sqlInstUpdate)
												.then((result) => {
													// log.info(`Products count A: ${productsCount}`);
													productsCount = productsCount - 1;
												})
												.catch((err) => {
													log.error(err);
												});
										})
										.catch((err) => {
											log.error(err);
										});

									// res.on('data', (d) => {
									// 	process.stdout.write(d);
									// 	// console.log(d);
									// });

									if (productsCount == 0) {
										// log.info(`Products count B: ${productsCount}`);
										resolve('success');
									}
								});

								req.on('error', (error) => {
									log.error(error);
								});

								req.write(productsData);

								req.end();
							});
						} else {
							log.info(`There are no new products.`);
							resolve('success');
						}

						// console.log('Data: ', products);
					})
					.catch((err) => {
						// console.log('Error B1:', err);
						log.error(err);
						reject(err);
					});
			})
			.catch((err) => {
				// console.log('Error B2:', err);
				log.error(err);
				reject(err);
			});
	});

	// log.info(result);

	return result;
};

const getSGIProductsData = () => {
	const result = new Promise((resolve, reject) => {
		let sqlInst = `select top 10 
				p.codigo,
				p.nome,
				p.desc_compl,
				p.preco,
				isnull(p.comprimento, 0) as comprimento,
				isnull(p.largura, 0) as largura,
				isnull(p.altura, 0) as altura,
				p.peso,
				isnull(f.nome, '') as fabricante,
				p.cod_barras,
				isnull(ige.codi_item_grade, 0) as codi_item_grade,
				isnull(ige.codi_grade, 0) as codi_grade,
				gru.nome as grupo_nome,
				isnull(ig.nome, '') as grade,
				isnull(gra.nome, '') as nome_grade,
				(case when isnull(ige.produto, 0) <> 0 then isnull(ige.estoque, 0) else isnull(p.estoque, 0) end) as estoque, 
				isnull((cast(p.codigo as varchar) + isnull(dbo.zeroesquerda(ige.codi_item_grade, 2), '') + isnull(dbo.zeroesquerda(ige.codi_grade, 3), '')), p.codigo) as id
			from produto p
			left join fabricante f on p.fabricante = f.codigo
			inner join grupo gru on gru.codigo = p.grupo
			left join itens_grade_estoque ige on ige.produto = p.codigo
			left join grades gra on gra.codigo = ige.codi_grade
			left join itens_grade ig on ig.codigo = ige.codi_item_grade
			where not p.data_alteracao is null and p.data_alteracao > '${moment(new Date(lastSync)).format('YYYY-MM-DD HH:mm:ss')}'
			order by p.codigo;`;
		new sqlDb.ConnectionPool(db.config)
			.connect()
			.then((pool) => {
				pool.request()
					.query(sqlInst)
					.then((data) => {
						// console.log('Data: ', data.recordsets[0]);
						log.info(`${data.recordsets[0].length} products to update stock or price.`);

						let productsCount = data.recordsets[0].length;

						// if (data.recordsets[0].length) {
						data.recordsets[0].forEach((item, index) => {
							// log.info(`Got here ${index}`);

							log.info(`Update item's stock ${item.id}`);

							axios({
								method: 'POST',
								url: `https://www.meudatacenter.com/api/v1/item/${item.id}/estoque`,
								headers: {
									'x-ID': '8721',
									'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
								},
							})
								.then(() => {
									log.info(`Finished updating item's stock`);
									log.info(`Update item's price`);
									axios({
										method: 'POST',
										url: `https://www.meudatacenter.com/api/v1/produto/${item.codigo}/preco`,
										headers: {
											'x-ID': '8721',
											'x-Token': '73O385975O459729e784813u4536S79O2892C22C5183O60S5059u25j1712e85u7923O18u8738O',
										},
									})
										.then((response) => {
											log.info(response);
											log.info(`Products count A: ${productsCount}`);
											productsCount = productsCount - 1;
										})
										.catch((err) => {
											log.error(err);
											reject(err);
										});
								})
								.catch((err) => {
									log.error(err);
									reject(err);
								});

							if (productsCount == 0) {
								log.info(`Products count B: ${productsCount}`);
								log.info(`Finished updating item's price`);
								resolve('success');
							}
						});
						// } else {
						// 	log.info(`There are no products to update.`);
						// 	resolve('success');
						// }

						// console.log('Data: ', products);
					})
					.catch((err) => {
						// console.log('Error B1:', err);
						log.error(err);
						reject(err);
					});
			})
			.catch((err) => {
				// console.log('Error B2:', err);
				log.error(err);
				reject(err);
			});
	});

	// log.info(result);

	return result;
};

setInterval(async () => {
	// runProductServices();
	log.info('Getting existing products from SGI.');
	const result4 = await getSGIProductsData();
	log.info(result4);
	log.info('Finished getting products from SGI.');
}, 15000);

// setInterval(async () => {
// 	runSaleServices();
// }, 120000);

const runProductServices = async () => {
	try {
		log.info('Getting new SGI products.');
		const result3 = await getSGINewProductsData();
		// log.info(result3);
		log.info('Finished getting SGI products.');
		log.info('Getting existing products from SGI.');
		const result4 = await getSGIProductsData();
		// log.info(result4);
		log.info('Finished getting products from SGI.');
		log.info('Updating date on file.');
		fse.writeFileSync(lastSyncFileInfo, new Date(), 'utf-8');
		log.info('Updated date on file.');
	} catch (error) {
		log.error(error);
		// console.error(error);
	}
};

const runSaleServices = async () => {
	try {
		log.info('Updating sales on Oruc from SGI.');
		const result1 = await getSGISales();
		// log.info(result1);
		log.info('Finished updating sales on Oruc from SGI.');
		log.info('Getting sales from Oruc.');
		const result2 = await getOrucSalesData();
		// log.info(result2);
		log.info('Finished getting sales from Oruc.');
	} catch (error) {
		log.error(error);
		// console.error(error);
	}
};

// setInterval(() => {
// 	getOrucSalesData().then((response1) => {
// 		if (response1.indexOf('success') !== -1) {
// 			console.log('Finished getting sales from Oruc');
// 			getSGISales().then((response2) => {
// 				if (response2.indexOf('success') !== -1) {
// 					console.log('Finished updating sales on Oruc from SGI');
// 					getSGIProductsData().then((response3) => {
// 						if (response3.indexOf('success') !== -1) {
// 							console.log('Finished inserting or updating products on Oruc from SGI');
// 						} else {
// 							console.log(response3);
// 						}
// 					});
// 					('');
// 				} else {
// 					console.log(response2);
// 				}
// 			});
// 		} else {
// 			console.log(response1);
// 		}
// 	});
// }, 15000);
