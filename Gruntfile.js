module.exports = function(grunt) {

    grunt.initConfig({
      jshint: {
        all: ['**/*.js', '!node_modules/**']
      }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('lint', ['jshint']);

};