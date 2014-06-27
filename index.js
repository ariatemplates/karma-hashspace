var fs = require('fs');
var path = require('path');

var hspRelativeToAbsolute = function(pathToConvert) {
    return path.normalize(__dirname + '/../../node_modules/hashspace' + pathToConvert);
};

var createPattern = function(path) {
    return {pattern: hspRelativeToAbsolute(path), included: true, served: true, watched: false};
};

var initHashSpace = function(config) {
    //add #space files to the karma config
    config.files.push(createPattern('/hsp/*.js'));
    config.files.push(createPattern('/hsp/rt/**/*.js'));
    config.files.push(createPattern('/hsp/gestures/**/*.js'));
    config.files.push(createPattern('/hsp/utils/eventgenerator.js'));
    config.files.push(createPattern('/hsp/utils/type.js'));
};

var createHspCompilePreprocessor = function (args, config, logger, helper) {

    // Try to look up compiler from the local installation path in order to use the source
    // of the compiler when testing hsp itself. It is a bit hackish but don't know of a
    // better approach for now...
    var localHspPath = path.normalize(__dirname + '/../../hsp/compiler/compiler.js');
    var compiler = fs.existsSync(localHspPath) ? require(localHspPath) : require('hashspace').compiler;

    var log = logger.create('preprocessor.hsp');

    return function (content, file, done) {

        log.debug('Processing "%s".', file.originalPath);
        var compileResult = compiler.compile(content, file.path);

        //TODO: refactor as soon as https://github.com/ariatemplates/hashspace/issues/61 is fixed
        if (compileResult.errors.length  === 0) {
            if (path.extname(file.path) === '.hsp') {
                file.path = file.path + '.js';
            }
            done(compileResult.code);
        } else {
            compileResult.errors.forEach(function(error){
                log.error('%s\n in %s at %d:%d', error.description, file.originalPath, error.line, error.column);
            });
            done(new Error(compileResult.errors));
        }
    };
};

var createHspTranspilePreprocessor = function (args, config, logger, helper) {

    var localHspPath = path.normalize(__dirname + '/../../hsp/transpiler/index.js');
    var hspTranspile = (fs.existsSync(localHspPath) ? require(localHspPath) : require('hashspace/hsp/transpiler/index.js')).processString;

    var log = logger.create('preprocessor.hsptranspile');

    return function (content, file, done) {

        log.debug('Processing "%s".', file.originalPath);

        try {
            done(hspTranspile(content, file.path).code);
        } catch (e) {
            log.error('%s\n in %s at %d:%d', e.message, file.originalPath, e.line, e.col);
            done(e);
        }
    };
};

// PUBLISH DI MODULE
module.exports = {
    'framework:hsp': ['factory', initHashSpace],
    'preprocessor:hsp-compile': ['factory', createHspCompilePreprocessor],
    'preprocessor:hsp-transpile': ['factory', createHspTranspilePreprocessor]
};