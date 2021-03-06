var glob = require("glob");
var path = require("path");
var fs = require('fs');

function walkUpToFindNodeModulesPath(context) {
  var tempPath = path.resolve(context, 'node_modules');
  var upDirPath = path.resolve(context, '../');

  if (fs.existsSync(tempPath) && fs.lstatSync(tempPath).isDirectory()) {
    return tempPath;
  } else if (upDirPath === context) {
    return undefined;
  } else {
    return walkUpToFindNodeModulesPath(upDirPath);
  }
}

function walkUpToFindScPath(context) {
  var tempPath = path.resolve(context, 'src');
  var upDirPath = path.resolve(context, '../');

  if (fs.existsSync(tempPath) && fs.lstatSync(tempPath).isDirectory()) {
    return context + '\\';
  } else if (upDirPath === context) {
    return undefined;
  } else {
    return walkUpToFindScPath(upDirPath);
  }
}

function isNodeModule(str) {
  return !str.match(/^\./);
}

module.exports = function(source) {
  this.cacheable && this.cacheable(true);

  var self = this;
  var regex = /.?import + ?((\w+) +from )?([\'\"])(.*?);?\3/gm;
  var importModules = /import +(\w+) +from +([\'\"])(.*?)\2/gm;
  var importFiles = /import +([\'\"])(.*?)\1/gm;
  var importSass = /@import +([\'\"])(.*?)\1/gm;
  var resourceDir = path.dirname(this.resourcePath);

  var regex2 = /.?import + ?(\{ ?(.*)? ?\} from )?([\'\"])(.*?);?\3/gm;
  var regex2_3 = /.?import + ?(\{ ?(\/\*(.*)\*\/)? ?(.*) ?\} from )?([\'\"])(.*?);?\5/gm;
  var regex2_2 = /.?import ?\{ ?([(\/\* ?(\w+) ?\*\/)? ?( ?(\w+),? ?)]+)? ?\}? +from ([\'\"])?(.*?);?\2/gm;
  var regex2_1 = /.?import + ?(\{?[ ?(\w+),? ?]+\}? +from )?([\'\"])?(.*?);?\2/gm;
  var objsReg = /\{? ?(.*?) ?\}? +from ?/g;
  var objsExcludeReg = /(\/\* ?(.*?) ?\*\/)/g;

  var nodeModulesPath = walkUpToFindNodeModulesPath(resourceDir);
  var srcPath = walkUpToFindScPath(resourceDir);

  function replacer(match, fromStatement, obj, quote, filename) {
    var modules = [];
    var withModules = false;

    if (!filename.match(/\*/)) return match;

    var globRelativePath = filename.match(/!?([^!]*)$/)[1];
    var prefix = filename.replace(globRelativePath, '');
    var cwdPath;

    if (isNodeModule(globRelativePath)) {
      if (!nodeModulesPath) {
        self.emitError(new Error("Cannot find node_modules directory."));
        return match;
      }

      cwdPath = nodeModulesPath;
    } else {
      cwdPath = resourceDir;
    }

    var result = glob
      .sync(globRelativePath, {
        cwd: cwdPath
      })
      .map((file, index) => {
        var fileName = quote + prefix + file + quote;

        if (match.match(importSass)) {
          return '@import ' + fileName;

        } else if (match.match(importModules)) {
          var moduleName = obj + index;
          modules.push(moduleName);
          withModules = true;
          return 'import * as ' + moduleName + ' from ' + fileName;

        } else if (match.match(importFiles)) {
          return 'import ' + fileName;

        } else {
          self.emitWarning('Unknown import: "' + match + '"');
        }
      })
      .join('; ');

    if (result && withModules) {
      result += '; var ' + obj + ' = [' + modules.join(', ') + ']';
    }

    if (!result) {
      self.emitWarning('Empty results for "' + match + '"');
    }

    return result;
  }

  function replacer2(match, fromStatement, imports, quote, filename) {
    var modules = [];
    var withModules = false;
    var objs = new RegExp(objsReg).exec(fromStatement)[1];
    // console.log("objs: ", objs);
    objs = objs.replace(objsExcludeReg, '');
    if(objs.indexOf(',') > -1) {
      objs = objs.split(",");
    }

    // if (!filename.match(/\*/)) return match;

    var globRelativePath = filename.match(/!?([^!]*)$/)[1];
    var prefix = filename.replace(globRelativePath, '');
    var cwdPath;

    if (isNodeModule(globRelativePath)) {
      if (!nodeModulesPath) {
        self.emitError(new Error("Cannot find node_modules directory."));
        return match;
      }

      cwdPath = nodeModulesPath;
    } else {
      cwdPath = resourceDir;
    }

    var incDirPath;

    if(Array.isArray(objs)) {
      for(var i = 0; i < objs.length; i++) {
        if(filename.indexOf(objs[i].trim()) > -1) {
          incDirPath = path.resolve(cwdPath, filename.substr(0, filename.length - objs[i].length));
        } else {
          incDirPath = path.resolve(cwdPath, filename);			
        }
        objs[i] = objs[i].trim() ? objs[i].trim() + '.js' : null;
      }
      objs = objs.filter(function (el) {
        return el != null;
      });
    } else {
      if(filename.indexOf(objs.trim()) > -1) {
        incDirPath = path.resolve(cwdPath, filename.substr(0, filename.length - objs.length));
      } else {
        incDirPath = path.resolve(cwdPath, filename);			
      }
      objs = objs.trim() + '.js'
    }
	
	// console.log(incDirPath);

	// if (fs.existsSync(tempPath) && fs.lstatSync(tempPath).isDirectory()) {
    
    // console.log(filename, quote, objs, globRelativePath, cwdPath, nodeModulesPath, resourceDir, incDirPath);

    var result = glob
      .sync2(objs, {
        cwd: incDirPath
      })
      .map((file, index) => {
        // var fileName = quote + prefix + file + quote;
        // console.log(file, index, fileName)

        // if (match.match(importSass)) {
          // return '@import ' + fileName;

        // } else if (match.match(importModules)) {
          // var _ret;
          // if(Array.isArray(objs)) {
            // _ret = [];
            // for(var i = 0; i < objs.length; i++) {
              // var moduleName = objs[i] + index;
              // modules.push(moduleName);
              // _ret.push('import * as ' + moduleName + ' from ' + fileName)
            // }
            // withModules = true;
          // } else {
            // var moduleName = objs + index;
            // modules.push(moduleName);
            // _ret = 'import * as ' + moduleName + ' from ' + fileName;
          // }
          // return _ret;

        // } else if (match.match(importFiles)) {
        var fileName = glob.getFileFromDir(incDirPath, file);
        // console.log(incDirPath, file);
        
        if (fileName) {
          fileName = ('' + quote + fileName.replace(/\\/g, '/') + quote)/*.replace(srcPath.replace(/\\/g, '/'), './');/*/.replace(/\//g, '\\\\'); 
          // console.log(fileName);
          return 'import ' + file.replace('.js', '') + ' from ' + fileName.replace('.js', '');
        } else {
          self.emitWarning('Unknown import: "' + match + '"');
        }
      })
      .join('; ');

    if (result && withModules) {
      if(Array.isArray(objs)) {
        result += '; var ' + objs[0] + ' = [' + modules.join(', ') + ']';
      } else {
        result += '; var ' + objs + ' = [' + modules.join(', ') + ']';
      }
    }

    if (!result) {
      self.emitWarning('Empty results for "' + match + '"');
    }
    
    // console.log("result: ", result);

    return result;
  }
  
  // var res = source.replace(regex, replacer);
  var res = source.replace(regex2, replacer2);
  return res;
};
