const infotep = require('../lib/infotep');
const variables = require('./suspender_variables');

const puppeteer = require('puppeteer');

const PARAMS = {
    waitUntil: 'load'
};

const printError = () => {
    console.log(
        'Por favor revise el archivo de variables y vuelva a intentar :D'
    );
};

const getFailedStudents = async function(page, gradesUrl) {
    await page.goto(gradesUrl);

    let failed = await page.evaluate(async () => {
        let failed = [];
        let columns = document.querySelectorAll('.grade.lastcol');

        let getUserId = elem => {
            let id = elem.getAttribute('id');
            id = id.substr(0, id.indexOf('i'));
            return id.replace('u', '');
        };
        for (let column of columns) {
            let id = getUserId(column);
            console.log(id);
            let grade = column.textContent;
            if (grade == '-') {
                failed.push(id);
            }

            grade = parseInt(column.textContent);
            if (grade == 0) {
                failed.push(id);
            }
        }
        return failed;
    });

    return failed;
};

const suspendUser = async function(page, url) {
    await page.goto(url);

    await page.evaluate(async () => {
        await jQuery('#id_status').val('1');
        await jQuery('#id_submitbutton').click();
    });

    await page.waitFor(1500);
};

const getUserEnrollments = async function(
    page,
    courseId,
    students,
    failedStudents
) {
    await page.goto(
        'http://plataformavirtual.infotepvirtual.com/user/index.php?id=' +
        courseId +
        '&perpage=5000'
    );
    let ue = await page.evaluate(
        async (students, failedStudents, courseId) => {
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
                    for (var j = 0; j < failedStudents.length; j++) {
                        let studentId = failedStudents[j];
                        if (rowsProcesadas[i][1].trim() === students[studentId].name.trim()) {
                            data[studentId] = links[i];
                        }
                    }
                }

                return data;
            },
            students,
            failedStudents,
            courseId
    );

    return ue;
};

const start = async function(username, password, courseUrl, courseId) {
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
            let students = await infotep.getStudents(page, gradesUrl);

            let failedStudents = await getFailedStudents(page, gradesUrl);

            let userEnrollments = await getUserEnrollments(
                page,
                courseId,
                students,
                failedStudents
            );
            let personasSuspendidas = [];
            let studentId;
            for (let i = 0; i < failedStudents.length; i++) {
                studentId = failedStudents[i];

                let url = userEnrollments[studentId];
                await suspendUser(page, url);
                console.log(
                    students[studentId].name + ' no participo y fue suspendido.'
                );
                personasSuspendidas.push(students[studentId].name);
            }
            await escribirOutput(personasSuspendidas);
        }
    }

    // await browser.close();
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

let courseId = variables.courseId();

start(username, password, courseUrl, courseId);