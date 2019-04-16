const variables = require('./ma_calif_variables');
const puppeteer = require('puppeteer');
const infotep = require('../lib/infotep');
const fastcsv = require('fast-csv');
const fs = require('fs');

const PARAMS = {
    waitUntil: 'load'
};
const DELAY = 2000;

const solve = async function(page, nombres) {
    let selector = 'a';

    await page.$$eval(selector, anchors => {
        for (let anchor of anchors) {
            if (anchor.textContent == 'Escribir') {
                anchor.click();
                return;
            }
        }
    });
    await page.waitFor(DELAY);
    await page.click('#id_recipients_ajax');
    await page.waitFor(DELAY);
    await page.click('.mail_search');
    for (var i = 0; i < nombres.length; i++) {
        await page.keyboard.type(nombres[i]);

        await page.waitFor(DELAY);
        await page.click('input[name=bcc_all]');
        await page.waitFor(DELAY);
        await page.click('.mail_search', {
            clickCount: 3
        });
    }

    selector = 'button';
    await page.$$eval(selector, buttons => {
        for (let button of buttons) {
            if (button.textContent == 'Aplicar') {
                button.click();
                return;
            }
        }
    });
    return true;
};

const printError = () => {
    console.log(
        'Por favor revise el archivo de variables y vuelva a intentar :D'
    );
};

const start = async function(
    username,
    password,
    courseUrl,
    crtierias,
    condition
) {
    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page._client.send('Emulation.clearDeviceMetricsOverride');
    let loggedin = await infotep.login(page, username, password);

    if (loggedin) {
        let gradesUrl = await infotep.getGradesUrl(courseUrl);
        if (!gradesUrl) {
            printError();
        } else {
            console.log(gradesUrl);
            console.log('BUSCANDO ESTUDIANTES');
            let students = await infotep.getStudentsWithConditions(
                page,
                criterias,
                condition,
                gradesUrl
            );

            console.log('ESTUDIANTES OBTENIDOS');
            console.log(students);

            nombres = students.map(elemento => elemento.nombre);
            codigos = students.map(elemento => elemento.codigo);

            console.log('Listado de estudiantes que cumplen con los criterios:');
            for (var i = 0; i < nombres.length; i++) {
                console.log('NOMBRE: ' + nombres[i] + ' |' + ' CODIGO: ' + codigos[i]);
            }
            await escribirOutput(nombres, codigos);
            let solver = await solve(page, nombres);
            if (solver) {
                console.log('Todo Listo para escribir un mensaje.');
            } else {
                printError();
            }
        }
    }
};

function escribirOutput(personas) {
    var result = 'Nombre';
    for (var i = 0; i < personas.length; i++) {
        result += '\r' + personas[i];
    }

    var fs = require('fs');

    fs.writeFile('output.csv', result, 'utf8', function(err) {
        if (err) {
            console.log('Hubo un error.');
        } else {
            console.log('Se ha guardado una lista de las personas en output.csv');
        }
    });

    return true;
}

let username = variables.username();
let password = variables.password();
let courseUrl = variables.courseUrl();
let criterias = variables.criterias();
let condition = variables.condition();

start(username, password, courseUrl, criterias, condition);