const COURSE_ID = 159;
module.exports = {
    username: function() {
        return '03103885764';
    },

    password: function() {
        return '03103885764';
    },

    codigo: function() {
        return '20190701504';
    },
    nombreCSV: function() {
        return 'output';
    },

    nombreNoListadoSNFP: function() {
        return 'nosnfp';
    },

    password2: function() {
        return 'd03103885764';
    },

      esDiplomado: function() {
        return true;
    },

    sobreEscribir: function() {
        return 'Y';
    },

    nombreOcultoMoodle: function() {
        return 'nomoodle';
    },

    minGrade: function(){
        return 10;
    },

    courseId: function() {
        return '' + COURSE_ID;
    },

    courseUrl: function() {
        return (
            'http://plataformavirtual.infotepvirtual.com/course/view.php?id=' +
            COURSE_ID
        );
    }
};