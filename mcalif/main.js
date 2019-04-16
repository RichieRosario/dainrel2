const variables = require('./mcalif_variables');
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
    minGrade,
    maxGrade
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
            let students = await infotep.getStudentsBetweenGrades(
                page,
                minGrade,
                maxGrade,
                gradesUrl
            );

            nombres = students.map(elemento => elemento.nombre);
            calificaciones = students.map(elemento => elemento.calificacion);

            console.log('Listado de estudiantes que cumplen con los criterios:');
            for (var i = 0; i < nombres.length; i++) {
                console.log(
                    'NOMBRE: ' + nombres[i] + ' |' + ' CALIFICACION: ' + calificaciones[i]
                );
            }
            await escribirOutput(nombres, calificaciones);

            let solver = await solve(page, nombres);
            if (solver) {
                console.log('Todo Listo para escribir un mensaje.');
            } else {
                printError();
            }
        }
    }
};

function escribirOutput(personas, calificaciones) {
    var result = 'Nombre,Calificación';
    for (var i = 0; i < personas.length; i++) {
        result += '\r' + personas[i] + ',' + calificaciones[i];
    }

    var fs = require('fs');

    fs.writeFile('output.csv', result, 'utf8', function(err) {
        if (err) {
            console.log('Hubo un error.');
        } else {
            console.log(
                'Se ha guardado una lista de las personas con sus calificaciones en output.csv'
            );
        }
    });

    return true;
}

let username = variables.username();
let password = variables.password();
let courseUrl = variables.courseUrl();
let minGrade = variables.minGrade();
let maxGrade = variables.maxGrade();

start(username, password, courseUrl, minGrade, maxGrade);