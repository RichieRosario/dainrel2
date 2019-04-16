const infotep = require('../lib/infotep');
const variables = require('./reportar_variables');
const fastcsv = require('fast-csv');
const puppeteer = require('puppeteer');
const fs = require('fs');
const PARAMS = {
    waitUntil: 'load'
};

const printError = () => {
    console.log(
        'Por favor revise el archivo de variables y vuelva a intentar :D'
    );
};

const showUser = async function(page, url) {
    await page.goto(url);

    await page.evaluate(async () => {
        await jQuery('#id_status').val('0');
        await jQuery('#id_submitbutton').click();
    });

    await page.waitFor(1500);
};

const getUserEnrollments = async function(page, courseId, students) {
    await page.goto(
        'http://plataformavirtual.infotepvirtual.com/user/index.php?id=' +
        courseId +
        '&perpage=5000'
    );
    let ue = await page.evaluate(
        async (students, courseId) => {
                let data = [];
                let rows = Array.from(
                    document.querySelectorAll('#participants>tbody>tr')
                );

                let links = Array.from(document.querySelectorAll('.editenrollink'));

                links = links.map(link => {
                    return link.href;
                });
                rows = rows.map(row => {
                    return row.innerText;
                });

                let rowsProcesadas = [];
                for (var i = 0; i < rows.length; i++) {
                    if (rows[i].trim() != '') {
                        rowsProcesadas.push(rows[i].split('\t'));
                    }
                }

                for (var i = 0; i < rowsProcesadas.length; i++) {
                    for (var j = 0; j < students.length; j++) {
                        if (rowsProcesadas[i][1].trim() === students[j].nombre.trim()) {
                            data.push(links[i]);
                        }
                    }
                }

                return data;
            },
            students,
            courseId
    );

    return ue;
};

const start = async function(
    username,
    password,
    courseUrl,
    courseId,
    students
) {
    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page._client.send('Emulation.clearDeviceMetricsOverride');
    console.log(students);
    let loggedin = await infotep.login(page, username, password);

    if (loggedin) {
        let gradesUrl = await infotep.getGradesUrl(courseUrl);
        if (!gradesUrl) {
            printError();
        } else {
            let userEnrollments = await getUserEnrollments(page, courseId, students);
            for (let i = 0; i < students.length; i++) {
                let url = userEnrollments[i];
                await showUser(page, url);
                console.log(students[i].nombre + ' estaba oculto y fue arreglado.');
            }
        }
    }

    // await browser.close();
};

let nombreCSV = variables.nombreOcultoMoodle();
var datosCSV = new Array();
var dataArr = [];

fs.createReadStream(nombreCSV + '.csv', {
        ignoreEmpty: true
    })
    .pipe(fastcsv())
    .on('data', function(data) {
        dataArr.push(data); // Add a row
    })
    .on('end', function() {
        if (dataArr[0] === undefined || dataArr[0].length == 0) {
            console.log(
                'El archivo ' +
                nombreCSV +
                '.csv esta vacio. Verificar e intentar de nuevo.'
            );
        }
        for (var i = 1; i < dataArr.length; i++) {
            datosCSV.push({
                nombre: dataArr[i][0],
                cedula: dataArr[i][1]
            });
        }
    })
    .on('error', function(error) {
        console.log('El archivo CSV esta abierto, cierrelo e intente de nuevo.');
        return res.fail('');
    });

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

let courseId = variables.courseId();

start(username, password, courseUrl, courseId, datosCSV);