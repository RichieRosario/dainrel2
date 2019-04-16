const COURSE_ID = 165;
module.exports = {
    username: function() {
        return '03103885764';
    },

    password: function() {
        return '03103885764';
    },

    minGrade: function() {
        return 0;
    },

    maxGrade: function() {
        return 60;
    },
    courseUrl: function() {
        return (
            'http://plataformavirtual.infotepvirtual.com/course/view.php?id=' +
            COURSE_ID
        );
    }
};