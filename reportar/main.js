const variables = require('./reportar_variables');
var fast_csv = require('fast-csv');
const puppeteer = require('puppeteer');

const PARAMS = {
    waitUntil: 'load'
};

let notStudents = [];
const login = async function(page, username, password, codigo, personas) {
    await page.goto('http://200.26.174.42:9080/');

    await page.click('#Login1_UserName');
    await page.keyboard.type(username);
    await page.click('#Login1_Password');
    await page.keyboard.type(password);
    await page.click('#Login1_LoginButton');
    // Wait for search results page to load
    await page.waitFor(10000);
    await page.click(
        '#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_FilterValue'
    );
    await page.keyboard.type(codigo);
    await page.click(
        '#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_ApplyFilterLink'
    );
    await page.waitFor(10000);
    await page.click(
        '#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_ListView1_ctrl0_ctl01_dropdownMenu1'
    );

    await page.click(
        '#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_ListView1_ctrl0_ctl01_lnkCalificacionParticipante'
    );
    await page.waitFor(5000);

    const text = await page.evaluate(() => {
        let elements = Array.from(
            document.querySelectorAll(
                '#ctl00_ContentPlaceHolder1_EditarNotaParticipantes1_GridView1>tbody>tr'
            )
        );
        let links = elements.map(element => {
            return element.innerText;
        });
        return links;
    });
    let tablaProcesada = [];
    for (var i = 0; i < text.length; i++) {
        tablaProcesada.push(text[i].split('\t'));
    }

    for (var i = 1; i < text.length; i++) {
        for (var j = 0; j < personas.length; j++) {
            let matriculaActual = tablaProcesada[i][0];

            if (matriculaActual == personas[j].matricula) {
                let fixi = i + 1;
                let calificacion = parseInt(
                    Math.round(personas[j].calificacion)
                ).toString();
                if (fixi < 10) {
                    await page.click(
                        '#ctl00_ContentPlaceHolder1_EditarNotaParticipantes1_GridView1_ctl0' +
                        fixi +
                        '_TextBox1'
                    );
                    await page.keyboard.type(calificacion);
                } else {
                    await page.click(
                        '#ctl00_ContentPlaceHolder1_EditarNotaParticipantes1_GridView1_ctl' +
                        fixi +
                        '_TextBox1'
                    );
                    await page.keyboard.type(calificacion);
                }
            }
        }
    }

    console.log('NOTAS SUBIDAS');
    return true;
};

const printError = () => {
    console.log(
        'Por favor revise el archivo de variables y vuelva a intentar :D'
    );
};

const start = async function(username, password, codigo, personas) {
    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page._client.send('Emulation.clearDeviceMetricsOverride');

    let loggedin = await login(page, username, password, codigo, personas);

    if (loggedin) {
        console.log('Curso evaluado.');
        // await browser.close();
    } else {
        printError();
    }
};

var personas = new Array();
var fs = require('fs');
var dataArr = [];
let filename = variables.nombreCSV() + '.csv';

fs.createReadStream(filename)
    .pipe(fast_csv())
    .on('data', function(data) {
        dataArr.push(data); // Add a row
    })
    .on('end', function() {
        for (var i = 0; i < dataArr.length; i++) {
            if (
                dataArr[i][dataArr[i].length - 3].trim() == '-' ||
                dataArr[i][dataArr[i].length - 3].trim() == ''
            ) {
                dataArr[i][dataArr[i].length - 3] = '0';
            } 
            personas.push({
                matricula: dataArr[i][1],
                calificacion: parseInt(dataArr[i][dataArr[i].length - 3].trim())
            });
        }
    })
    .on('error', function(error) {
        console.log('El archivo Csv esta abierto, cierrelo e intente de nuevo.');
        return res.fail('');
    });

let username = variables.username();
let password = variables.password2();
let codigo = variables.codigo();

start(username, password, codigo, personas);