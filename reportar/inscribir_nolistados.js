const variables = require('./reportar_variables');
const puppeteer = require('puppeteer');
const infotep = require('../lib/infotep');
const fastcsv = require('fast-csv');
const fs = require('fs');
let path = require('path');



    const readline = require('readline');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
const PARAMS = {
    waitUntil: 'load'
}


const solve = async function(page, username, password, codigo, nombres, cedulas, esDiplomado,rl) {


    await page.goto('http://200.26.174.42:9080/');
    await page.click('#Login1_UserName');
    await page.keyboard.type(username);
    await page.click('#Login1_Password');
    await page.keyboard.type(password);
    await page.click('#Login1_LoginButton')
    await page.waitFor('#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_FilterValue')
    await page.click('#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_FilterValue');
    await page.keyboard.type(codigo);
    await page.click('#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_ApplyFilterLink')
    await page.waitFor('#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_ListView1_ctrl0_ctl01_dropdownMenu1')
    await page.click('#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_ListView1_ctrl0_ctl01_dropdownMenu1');
    await page.click('#ctl00_ContentPlaceHolder1_Lista_Accion_Formativa_Iniciada1_ListView1_ctrl0_ctl01_lnkInscripcion');
    await page.waitFor('.ui-dialog-titlebar-close')
    await page.click('.ui-dialog-titlebar-close');
    for (var i = 0; i < cedulas.length; i++) {
        let cedula = cedulas[i];
        let nombre = nombres[i];

        let found = true;
        await page.waitFor(1000)
        await page.click('#ctl00_ContentPlaceHolder1_BuscarButton')
        await page.waitForSelector('#documento', {
            visible: true
        })
        await page.click('#documento');
        await page.keyboard.type(cedulas[i])
        await page.waitFor(1000)

        await page.on('dialog', async dialog => {
            await dialog.accept();
            await page.waitFor(1000)
            await page.click('.ui-dialog-titlebar-close');
            var start = new Date(Date.now());
            start = start.toLocaleString('es-ES');
            await escribirLog(codigo, cedula, nombre, start, 'Cedula', sobreEscribir);

            found = false;
        })


        let isNotHidden = await page.$eval('.ui-dialog-buttonset button', (elem) => {
            return window.getComputedStyle(elem).getPropertyValue('display') !== 'none' && elem.offsetHeight
        });
        if(isNotHidden){
        await page.click('.ui-dialog-buttonset button')[0];
        }
        await page.waitFor(1000)
        await page.removeAllListeners('dialog');
        if (found) {
            let submit = await page.evaluate(async (esDiplomado, i) => {

                let direccion = document.querySelector('#ctl00_ContentPlaceHolder1_DIRECCION').value;
                let nacimiento = document.querySelector('#ctl00_ContentPlaceHolder1_LUGAR_NAC').value;
                let provincia = document.querySelector('#ctl00_ContentPlaceHolder1_PROVINCIA').value;
                let fechaNacimiento = document.querySelector('#ctl00_ContentPlaceHolder1_FECHA_NACIMIENTO').value;

                let ano = parseInt(fechaNacimiento.split('/')[2])

                if (provincia == "") {
                    document.querySelector('#ctl00_ContentPlaceHolder1_PROVINCIA').value = "32";
                }
                if (direccion == "") {
                    document.querySelector('#ctl00_ContentPlaceHolder1_DIRECCION').value = "-";
                }
                if (nacimiento == "") {
                    document.querySelector('#ctl00_ContentPlaceHolder1_LUGAR_NAC').value = "Santo Domingo";
                }

                if (esDiplomado) {
                    document.querySelector('#ctl00_ContentPlaceHolder1_IDNIVEL_EDUCACION').value = "7";
                }

                return true;
            }, esDiplomado, i);

            if (submit) {
                 await page.waitFor(1000)
                page.on('dialog', async dialog => {
                    await dialog.accept();
                    var start = new Date(Date.now());
                    start = start.toLocaleString('es-ES');
                    await escribirLog(codigo, cedula, nombre, start, 'Fecha de Nacimiento', sobreEscribir)
                    found = false;
                })
                await page.click('#ctl00_ContentPlaceHolder1_AgregarButton');

                await page.waitFor(1000)
                await page.removeAllListeners('dialog')

                // try {
                //     await page.waitForSelector('.ui-dialog-titlebar-close', {
                //         visible: true
                //     })
                // } catch (error) {
                //     var start = new Date(Date.now());
                //     start = start.toLocaleString('es-ES');

                //     await escribirLog(codigo, cedula, nombre, start, 'Fecha de nacimiento', sobreEscribir)
                //     // i++;
                // }
            } else {

                var start = new Date(Date.now());
                start = start.toLocaleString('es-ES');

                await escribirLog(codigo, cedula, nombre, start, 'Fecha de nacimiento', sobreEscribir)


            }

        }


    }



    isNotHidden = await page.$eval('.ui-dialog-titlebar-close', (elem) => {
        return window.getComputedStyle(elem).getPropertyValue('display') !== 'none' && elem.offsetHeight
    });
    if (isNotHidden) {
        await page.click('.ui-dialog-titlebar-close');
    }

    await rl.question('¿Desea procesar los estudiantes? (y/n)', async (answer1) => {
        let timeout = 0;
        if (answer1 === "y") {
            console.log("Usted ha elegido procesar los estudiantes inscritos.")

            await page.click('#ctl00_ContentPlaceHolder1_ProcesarButton');
            console.log("Estudiantes inscritos");
            timeout = nombres.length*500;
            
        } else {
            // console.log(answer1);
            console.log("Usted ha elegido no procesar los estudiantes inscritos.")
             

        }
        await page.waitFor(timeout);
        // await page.waitForNavigation( { waitUntil : 'networkidle0' });
        await page.browser().close();

        await rl.close();

    });

    return true;
}




 var exec = require('child_process').exec;

function checkIfUnusedOutput(path) {
    exec('lsof ' + path, function(err, stdout, stderr) {
        if (stdout.length === 0) {
          
        } else {
            console.log("El archivo output.csv esta en uso");
        }
    });
}



function checkIfUnusedLog(path) {
    exec('lsof ' + path, function(err, stdout, stderr) {
        if (stdout.length === 0) {
          
        } else {
            console.log("El archivo log.csv esta en uso");
        }
    });
}



function escribirLog(codigo, cedula, nombre, fecha, razon, sobreEscribir) {

    console.log('Escribiendo en log:'+codigo + cedula + nombre + razon);
   
    var fs = require('fs');

    var dir = __dirname+'/log.csv';
    checkIfUnusedLog(dir);
    

    if (sobreEscribir != 'Y') {
        var ws = fs.createWriteStream("log.csv", {
            flags: 'a'
        });
        fastcsv
            .write(
                [
                    [codigo, nombre, "'" + cedula, fecha, razon]
                ], {
                    headers: true,
                    includeEndRowDelimiter: true
                }
            )
            .pipe(ws);

    } else {
        var ws = fs.createWriteStream("log.csv");
        fastcsv
            .write(
                [
                    [codigo, nombre, "'" + cedula, fecha, razon]
                ], {
                    headers: true,
                    includeEndRowDelimiter: true
                }
            )
            .pipe(ws);


    }

    return true;
}





const printError = () => {
    console.log('Por favor revise el archivo de variables y vuelva a intentar :D')
}

const isEmpty = async function(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}




const start = async function(username, password, password2, codigo, courseUrl, minGrade, esDiplomado, datosCSV,rl) {
    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page._client.send('Emulation.clearDeviceMetricsOverride')
    let loggedin = await infotep.login(page, username, password);

    if (loggedin) {
         let gradesUrl = await infotep.getGradesUrl(courseUrl)
        if (!gradesUrl) {
            printError()
        } else {
            let students = await infotep.getStudentsWithGrades(page, minGrade, gradesUrl);

            nombres = students.map(elemento => elemento.nombre)
            let cedulas = []
            let nombresFinal = []
            for (var i = 0; i < datosCSV.length; i++) {

                let nombre = datosCSV[i].nombre.trim()
                let cedula = datosCSV[i].cedula
                let flag = false
                for (var j = 0; j < nombres.length; j++) {
                    if (nombre === nombres[j].trim()) {
                        flag = true

                    }
                }

                if (flag) {
                    nombresFinal.push(nombre)
                    cedulas.push(cedula)
                    flag = false
                }
            }

            console.log("Listado de estudiantes que no estan inscritos y cumplen con los criterios:")
            for (var i = 0; i < datosCSV.length; i++) {
                console.log("NOMBRE: " + datosCSV[i].nombre + ' |' + " CEDULA: " + datosCSV[i].cedula)
             
            }

            // await escribirOutput(codigo, nombresFinal, cedulas); 
            let solver = await solve(page, username, password2, codigo, nombres, cedulas, esDiplomado,rl);
            if (solver) {

                console.log("Estudiantes inscritos")
            } else {
                printError()
            }
        }
    }

}



let nombreCSV = variables.nombreNoListadoSNFP();
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
            console.log("El archivo " + nombreCSV + ".csv esta vacio. Verificar e intentar de nuevo.")
        }
        for (var i = 1; i < dataArr.length; i++) {

            datosCSV.push({
                nombre: dataArr[i][0],
                cedula: dataArr[i][1]
            });
        }

    })
    .on('error', function(error) {
        console.log("El archivo CSV esta abierto, cierrelo e intente de nuevo.");
        return res.fail('');
    })


let username = variables.username();
let password = variables.password();
let password2 = variables.password2();
let codigo = variables.codigo();
let minGrade = variables.minGrade();
let courseUrl = variables.courseUrl();
let esDiplomado = variables.esDiplomado();
let sobreEscribir = variables.sobreEscribir();
start(username, password, password2, codigo, courseUrl, minGrade, esDiplomado, datosCSV,rl);