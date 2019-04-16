module.exports = {
    login: async function(page, username, password) {
        await page.goto(
            'http://plataformavirtual.infotepvirtual.com/login/index.php', {
                waitUntil: 'networkidle2'
            }
        );
		
	    const popup = false;
	    if (popup) {
			await page.waitForSelector('.modal');
			const button = await page.waitForSelector('button.btn', {
			    visible: true
			});
			await button.click();
			await page.waitForSelector('button.btn', {
			    visible: false
			});
		}
        await page.waitForSelector('#username');
        await page.evaluate(username => {
            const anchor = document.querySelector('#username');
            anchor.value = username;
        }, username);
        await page.waitForSelector('#password');
        await page.evaluate(password => {
            const anchor = document.querySelector('#password');
            anchor.value = password;
        }, password);
        let selector = '#Continuar';
        await page.evaluate(
            selector => document.querySelector(selector).click(),
            selector
        );

        // Wait for search results page to load
        await page.waitFor('#block-region-side-pre');

        let success = await page.evaluate(() => {
            let error = document.querySelector('.error');
            if (error) return false;
            return true;
        });

        if (success) {
            console.log('SESION INICIADA');
        } else {
            console.log(
                'Fallo en inicio de sesion. Por favor revisar los datos de usuarios.'
            );
        }
        return success;
    },

    getGradesUrl: async function(courseUrl) {
        if (courseUrl.includes('id')) {
            let gradeUrl =
                'http://plataformavirtual.infotepvirtual.com/grade/report/grader/index.php?';
            gradeUrl += courseUrl.substr(courseUrl.indexOf('id'));
            return gradeUrl;
        } else {
            console.log(
                'No se pudo encontrar el link para reportar calificaciones. Revise la URL del curso.'
            );
        }
        return '';
    },

    getStudentsWithGrades: async function(page, x, gradesUrl) {
        await page.goto(gradesUrl);
        let students = await page.evaluate(async x => {
            let students = [];
            let columns = document.querySelectorAll('.grade.lastcol');

            let getUserId = elem => {
                let id = elem.getAttribute('id');
                id = id.substr(0, id.indexOf('i'));
                return id.replace('u', '');
            };
            for (let column of columns) {
                let id = getUserId(column);

                let name = Array.from(
                    document.querySelectorAll('#fixed_user_' + id + ' a.username')
                );
                let nombre = name[0].innerText;

                let grade = column.textContent;
                if (parseInt(grade) >= x) {
                    students.push({
                        codigo: id,
                        calificacion: grade,
                        nombre
                    });
                }
            }
            return students;
        }, x);

        return students;
    },

    getStudentsBetweenGrades: async function(page, x, y, gradesUrl) {
        await page.goto(gradesUrl);

        let students = await page.evaluate(
            async (x, y) => {
                    let students = [];
                    let columns = document.querySelectorAll('.grade.lastcol');

                    let getUserId = elem => {
                        let id = elem.getAttribute('id');
                        id = id.substr(0, id.indexOf('i'));
                        return id.replace('u', '');
                    };
                    for (let column of columns) {
                        let id = getUserId(column);
                        let name = Array.from(
                            document.querySelectorAll('#fixed_user_' + id + ' a.username')
                        );
                        let nombre = name[0].innerText;

                        let grade = column.textContent;
                        if (parseInt(grade) >= x && parseInt(grade) <= y) {
                            students.push({
                                codigo: id,
                                calificacion: grade,
                                nombre: nombre
                            });
                        }
                    }
                    return students;
                },
                x,
                y
        );

        return students;
        console.log(students);
    },

    getExcludedStudentsFromActivity: async function(
        page,
        activityName,
        gradesUrl
    ) {
        await page.goto(gradesUrl);
        console.log(activityName);


        let activityUrl = await page.evaluate(async (activityName) => {
            let students_names = [];
            let columns = document.querySelectorAll('.grade.lastcol');
            let headings = Array.from(document.querySelectorAll('a.gradeitemheader'));
            let enlaces = headings.map(td => td.href);
            let titulos = headings.map(td => td.innerText);
            let Url = "";
            for (var i = 0; i < titulos.length; i++) {
                if (titulos[i].trim() === activityName) {
                    Url = enlaces[i] + "&action=grading";
                }
            }


            console.log(enlaces);
            console.log('============');
            console.log(titulos);

            return Url;
        }, activityName);
        await page.goto(activityUrl);

        await page.evaluate(async () => {
            await jQuery('#id_filter').val('1');
        });

        let excluded_students = await page.evaluate(async () => {
            let names = Array.from(document.querySelectorAll('table .cell.c2'));
            names = names.map(td => td.innerText);
            names = names.filter(function(el) {
                return el;
            });
            return names;
        });

        return excluded_students;
    },

    getStudentsWithConditions: async function(
        page,
        criterias,
        condition,
        gradesUrl
    ) {
        await page.goto(gradesUrl);

        let students = await page.evaluate(
            async (criterias, condition) => {
                    let students_final = [];
                    let columns = document.querySelectorAll('.grade.lastcol');

                    let getUserId = elem => {
                        let id = elem.getAttribute('id');
                        id = id.substr(0, id.indexOf('i'));
                        return id.replace('u', '');
                    };

                    let elements = Array.from(document.querySelectorAll('.heading'));
                    let text = elements[0].innerText;

                    let splitted = text.split('\t');
                    let dictio = {};
                    let validcriterias = [];
                    for (var j = 0; j < splitted.length; j++) {
                        for (var i = 0; i < criterias.length; i++) {
                            if (criterias[i] == splitted[j]) {
                                dictio[criterias[i]] = j + 1;
                                validcriterias.push(criterias[i]);
                            }
                        }
                    }

                    let invalidids = [];
                    for (let column of columns) {
                        let id = getUserId(column);

                        let name = Array.from(
                            document.querySelectorAll('#fixed_user_' + id + ' a.username')
                        );
                        let nombre = name[0].innerText;

                        let calificacionTotal = column.textContent;

                        if (condition == 'OR') {
                            for (var i = 0; i < criterias.length; i++) {
                                if (validcriterias.includes(criterias[i])) {
                                    let nota = document.querySelector(
                                        '#fixed_user_' +
                                        id +
                                        ' .clickable.cell.c' +
                                        dictio[criterias[i]]
                                    ).textContent;
                                    if (nota == '-' || nota == '0') {
                                        if (!invalidids.includes(id)) {
                                            invalidids.push(id);
                                            students_final.push({
                                                codigo: id,
                                                calificacion: calificacionTotal,
                                                nombre
                                            });
                                        }
                                    }
                                }
                            }
                        } else if (condition == 'AND') {
                            donecriterias = [];
                            for (var i = 0; i < criterias.length; i++) {
                                if (validcriterias.includes(criterias[i])) {
                                    let nota = document.querySelector(
                                        '#fixed_user_' +
                                        id +
                                        ' .clickable.cell.c' +
                                        dictio[criterias[i]]
                                    ).textContent;
                                    if (nota == '-' || nota == '0') {
                                        donecriterias.push(criterias[i]);

                                        if (i == criterias.length - 1) {
                                            if (donecriterias.length == validcriterias.length) {
                                                let equ = false;
                                                for (var k = 0; k < validcriterias.length; k++) {
                                                    if (validcriterias.includes(donecriterias[k])) {
                                                        equ = true;
                                                    } else {
                                                        equ = false;
                                                    }
                                                }
                                                if (equ) {
                                                    if (!invalidids.includes(id)) {
                                                        invalidids.push(id);
                                                        students_final.push({
                                                            codigo: id,
                                                            calificacion: calificacionTotal,
                                                            nombre
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (condition == 'SI-NO') {
                            if (validcriterias.includes(criterias[0])) {
                                let nota = document.querySelector(
                                    '#fixed_user_' +
                                    id +
                                    ' .clickable.cell.c' +
                                    dictio[criterias[0]]
                                ).textContent;
                                if (!(nota == '-' || nota == '0')) {
                                    if (validcriterias.includes(criterias[1])) {
                                        let nota = document.querySelector(
                                            '#fixed_user_' +
                                            id +
                                            ' .clickable.cell.c' +
                                            dictio[criterias[1]]
                                        ).textContent;
                                        if (nota == '-' || nota == '0') {
                                            if (!invalidids.includes(id)) {
                                                invalidids.push(id);
                                                students_final.push({
                                                    codigo: id,
                                                    calificacion: calificacionTotal,
                                                    nombre
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    return students_final;
                },
                criterias,
                condition
        );

        return students;
    },
    getStudents: async function(page, gradesUrl) {
        await page.goto(gradesUrl);

        const result = await page.evaluate(() => {
            let getUserId = userLink => {
                const USER_PREFIX_URL =
                    'http://plataformavirtual.infotepvirtual.com/user/view.php?id=';
                userLink = userLink.replace(USER_PREFIX_URL, '');
                return userLink.substring(0, userLink.indexOf('&'));
            };

            let data = {};
            let users = document.querySelectorAll('.user.cell a.username');
            for (let user of users) {
                let userId = getUserId(user.href);
                data[userId] = {
                    posts: 0,
                    topics: 0,
                    name: user.innerText
                };
            }
            return data;
        });
        console.log('LISTADO DE ESTUDIANTES OBTENIDO');
        return result;
    }
};
