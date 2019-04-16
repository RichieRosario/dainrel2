const COURSE_ID = 456;
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

    gradesUrl: function() {
        return (
            'http://plataformavirtual.infotepvirtual.com/grade/report/grader/index.php?id=' +
            COURSE_ID
        );
    },

    maxPoints: function() {
        return 20;
    },

    forumName: function() {
        return 'Foro Unidad 2';
    }
};