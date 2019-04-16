const COURSE_ID = 165;
module.exports = {
    username: function() {
        return '03103885764';
    },

    password: function() {
        return '03103885764';
    },

    courseUrl: function() {
        return (
            'http://plataformavirtual.infotepvirtual.com/course/view.php?id=' +
            COURSE_ID
        );
    },

    criterias: function() {
        return ['Foro Unidad 1', 'Entrega Unidad 1'];
    },
    condition: function() {
        return 'SI-NO';
    }
};