const infotep = require('../lib/infotep');
const variables = require('./foros_variables');

const puppeteer = require('puppeteer');

const PARAMS = {
    waitUntil: 'load'
};

let notStudents = [];
const viewTopic = async function(page, topicUrl, students) {
    await page.goto(topicUrl);

    const replies = await page.evaluate(() => {
        let getUserId = userLink => {
            const USER_PREFIX_URL =
                'http://plataformavirtual.infotepvirtual.com/user/view.php?id=';
            userLink = userLink.replace(USER_PREFIX_URL, '');
            return userLink.substring(0, userLink.indexOf('&'));
        };

        let starter = document.querySelector('.starter .author a');
        let starterId = getUserId(starter.href);
        let starterName = starter.textContent;

        let data = {
            posterId: starterId,
            posterName: starterName,
            others: []
        };

        let otherPosts = document.querySelectorAll('.indent .forumpost .author a');
        for (let otherPost of otherPosts) {
            let posterId = getUserId(otherPost.href);
            let posterName = otherPost.textContent;
            data.others.push({
                id: posterId,
                name: posterName
            });
        }
        return data;
    });

    if (students[replies.posterId]) {
        students[replies.posterId].topics += 1;
        students[replies.posterId].posts += 1;
    } else {
        notStudents.push(replies.posterName);
    }

    for (let poster of replies.others) {
        if (students[poster.id]) {
            students[poster.id].posts += 1;
        } else {
            notStudents.push(poster.name);
        }
    }
};

let uniq = a => {
    return a.sort().filter(function(item, pos, ary) {
        return !pos || item != ary[pos - 1];
    });
};

const getPosts = async function(page, forumUrl, students) {
    await page.goto(forumUrl);

    const topics = await page.evaluate(() => {
        let data = [];

        let posts = document.querySelectorAll('.starter a');
        for (var post of posts) {
            data.push(post.href);
        }
        return data;
    });

    for (let topic of topics) {
        await viewTopic(page, topic, students);
    }

    console.log('CONTEO REALIZADO');
    return students;
};

const calculatePoints = (topics, posts, maxPoints) => {
    if (posts == 0) return 0;

    if (maxPoints == 5) {
        if (topics == 0) {
            return 1;
        } else {
            if (posts == 1 || posts == 2) {
                return 4;
            }
            if (posts >= 3) {
                return 5;
            }
        }
    }

    if (maxPoints == 10) {
        if (topics == 0) {
            if (posts == 1) return 1;
            return 2;
        } else {
            if (posts == 1) {
                return 7;
            }

            if (posts == 2) {
                return 9;
            }

            if (posts >= 3) {
                return 10;
            }
        }
    }

    if (maxPoints == 15) {
        if (topics == 0) {
            if (posts == 1) {
                return 2;
            }
            return 3;
        } else {
            if (posts == 1) {
                return 11;
            }

            if (posts == 2) {
                return 13;
            }

            if (posts >= 3) {
                return 15;
            }
        }
    }

    if (maxPoints == 20) {
        if (topics == 0) {
            if (posts == 1) {
                return 2;
            }
            return 5;
        } else {
            if (posts == 1) {
                return 15;
            }

            if (posts == 2) {
                return 18;
            }

            if (posts >= 3) {
                return 20;
            }
        }
    }

    if (maxPoints == 25) {
        if (topics == 0) {
            if (posts == 1) {
                return 2;
            }

            return 4;
        } else {
            if (posts == 1) {
                return 20;
            }

            if (posts == 2) {
                return 23;
            }

            if (posts >= 3) {
                return 25;
            }
        }
    }
};

const calculateGrades = async function(students, maxPoints) {
    Object.keys(students).forEach(key => {
        students[key].points = calculatePoints(
            students[key].topics,
            students[key].posts,
            maxPoints
        );
    });
    console.log('PUNTUACIONES CALCULADAS');
};

const uploadGrades = async function(
    page,
    students,
    gradesUrl,
    forumName,
    maxScore
) {
    console.log('UPLOADING GRADES ->' + gradesUrl);
    await page.goto(gradesUrl);
    page.on('console', consoleObj => console.log(consoleObj.text()));
    let success = await page.evaluate(
        async (students, forumName, maxScore) => {
                function delay(time) {
                    return new Promise(function(resolve) {
                        setTimeout(resolve, time);
                    });
                }

                let columns = document.querySelectorAll('.heading .item');

                let data = {};
                let columnNo;
                let found = false;
                for (var ccolumn of columns) {
                    let text = ccolumn.textContent;
                    if (text === forumName) {
                        let link = ccolumn.childNodes[0].href;
                        link = link.replace(
                            'http://plataformavirtual.infotepvirtual.com/mod/forum/view.php?id=',
                            ''
                        );

                        columnNo = ccolumn.className
                            .split(/\s+/)
                            .filter(
                                e => e.startsWith('c') && !e.startsWith('ca') && e !== 'cell'
                            )[0];

                        ccolumn.classList.forEach(klass => {
                            if (klass.startsWith('i') && klass !== 'item')
                                data.courseId = klass.replace('i', '');
                        });
                        data.column = parseInt(columnNo.replace('c', ''));
                        found = true;

                        data.text = text;
                    }
                }

                if (found === false) {
                    return {
                        type: 0
                    };
                }
                console.log(data.column - 1);
                let rangeSelector =
                    '.range.i' + data.courseId + '.cell.c' + (data.column - 1);
                let rangeValue = document.querySelector(rangeSelector).innerText;
                rangeValue = rangeValue.substring(2);
                if (parseInt(rangeValue) !== maxScore) {
                    console.log(
                        'El valor de puntuacion maxima parece incorrecto. Por favor verificar.'
                    );
                    return {
                        type: 1,
                        column: data.column,
                        data: rangeValue,
                        text: data.text
                    };
                }

                let keys = Object.keys(students);
                for (var i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    if (students[key].points > 0) {
                        let id = '#u' + key + 'i' + data.courseId;

                        let cell = document.querySelector(id);

                        await cell.click();
                        await delay(300);

                        let input = document.querySelector(id).childNodes[0].childNodes[0];
                        input.value = students[key].points;
                        await delay(300);
                    }
                }

                for (var i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    if (students[key].points > 0) {
                        let id = '#u' + key + 'i' + data.courseId;

                        let cell = document.querySelector(id);

                        await cell.click();
                        await delay(300);

                        let input = document.querySelector(id).childNodes[0].childNodes[0];
                        input.value = students[key].points;
                        await delay(300);
                    }
                }

                return {
                    type: 2
                };
            },
            students,
            forumName,
            maxScore
    );

    console.log(success);
    if (success.type == 0) {
        console.log(
            'No se encontro la columna correcta para reportar las notas. Revise el nombre del foro'
        );
        return false;
    } else if (success.type == 1) {
        console.log(
            'El valor de puntuacion maxima parece incorrecto. Por favor verificar.'
        );
        console.log(
            'Parece que la puntuacion maxima es: ' +
            success.data +
            ' - ' +
            success.text +
            ' - ' +
            success.column
        );
        return false;
    } else if (success.type == 2) {
        console.log('PUNTUACIONES SUBIDAS');
        return true;
    }
};

const getGradesUrl = async function(page, courseUrl) {
    await page.goto(courseUrl);

    let link = await page.evaluate(() => {
        let links = document.querySelectorAll('a');
        for (let link of links) {
            if (link.textContent == 'Calificaciones') return link.href;
        }
        return null;
    });

    if (link == null) {
        console.log(
            'No se pudo encontrar el link para reportar calificaciones. Revise la URL del curso.'
        );
    }

    console.log('GRADES URL -> ' + link);
    return link;
};

const getForumUrl = async function(page, courseUrl, forumName) {
    await page.goto(courseUrl);

    let link = await page.evaluate(forumName => {
        let links = document.querySelectorAll('a');
        for (let link of links) {
            let text = link.textContent.replace(' Foro', '');
            if (text == forumName) return link.href;
        }
        return null;
    }, forumName);

    if (link == null) {
        console.log(
            'No se pudo encontrar el link del foro. Revise el nombre del foro.'
        );
    }

    return link;
};

const printLogs = async function(students) {
    console.log('');
    console.log('Observaciones');
    let first = true;

    Object.keys(students).forEach(key => {
        if (students[key].points > 0 && students[key].topics == 0) {
            if (first) {
                console.log('---ESTUDIANTES SIN HILOS---');
                first = false;
            }
            console.log(
                students[key].name +
                ' obtuvo ' +
                students[key].points +
                ' sin publicar un hilo'
            );
        }
    });

    console.log('');
    first = true;
    uniq(notStudents).forEach(name => {
        if (first) {
            console.log('---NO ESTUDIANTES QUE ESCRIBIERON---');
            first = false;
        }
        console.log(name + ' escribio en el foro');
    });
};

const printError = () => {
    console.log(
        'Por favor revise el archivo de variables y vuelva a intentar :D'
    );
};

const start = async function(
    username,
    password,
    gradesUrl,
    courseUrl,
    maxPoints,
    forumName
) {
    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page._client.send('Emulation.clearDeviceMetricsOverride');

    let loggedin = await infotep.login(page, username, password);

    if (loggedin) {
        //let gradesUrl = await getGradesUrl(page, courseUrl)
        let forumUrl = await getForumUrl(page, courseUrl, forumName);

        if (!gradesUrl || !forumUrl) {
            printError();
        } else {
            let students = await infotep.getStudents(page, gradesUrl);
            let grades = await getPosts(page, forumUrl, students);

            await calculateGrades(students, maxPoints);

            let posted = await uploadGrades(
                page,
                students,
                gradesUrl,
                forumName,
                maxPoints
            );
            let names = [];
            let gradesToPoints = [];
            Object.keys(students).forEach(key => {
                names.push(students[key].name);
                gradesToPoints.push(students[key].points);
            });

            await writeOutput(names, forumName, gradesToPoints);

            if (posted) {
                await printLogs(students);
            } else {
                printError();
            }
        }
    }

    //console.log(students)
    // await browser.close();
};

function writeOutput(names, forumName, gradesToPoints) {

	   fs.open('output.csv', 'r+', function(err, data) {
        if (err) {
            console.log("El archivo output.csv esta abierto, favor cerrarlo e intentar de nuevo.");
        }
    });

	   
    var result = 'Nombre,Nombre de Foro,Calificación';
    for (var i = 0; i < names.length; i++) {
        result += '\r' + names[i] + ',' + forumName + ',' + gradesToPoints[i];
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
//let forumUrl = variables.forumUrl();
let gradesUrl = variables.gradesUrl();
let courseUrl = variables.courseUrl();
let maxPoints = variables.maxPoints();
let forumName = variables.forumName();
start(username, password, gradesUrl, courseUrl, maxPoints, forumName);