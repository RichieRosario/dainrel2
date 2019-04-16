const COURSE_ID = 455;
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

    activityName: function() {
        return 'Entrega Unidad 1';
    }
};