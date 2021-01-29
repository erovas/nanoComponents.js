(function(window, document){
    //Estilo donde se guardará todos los estilos de los componentes
    const STYLE = document.createElement('style');
    const HTML = document.querySelector('html');
    const SELFTAG = 'self-tag';
    const ISRENDER = '-_-is-render';
    const ISNC = 'is-nc';

    //Guarda las definiciones de los nanoComponents
    const Components = new Map();
    //Guarda los nodeList vivos de los tags que estan en el document
    const NCinside = new Map();
    //Nombres de nano Components reservados
    const reservedTagNames = new Set(['annotation-xml', 'color-profile', 'font-face', 'font-face-src', 'font-face-uri', 'font-face-format', 'font-face-name', 'missing-glyph',]);

    /**
     * verifica que el tagName es valido para ser utilizado
     * @param {string} tagName 
     */
    const _isValidTagName = function(tagName){
        const validSyntax = /^[a-z][.0-9_a-z]*-[\-.0-9_a-z]*$/.test(tagName);
        const reserved = reservedTagNames.has(tagName);
        return validSyntax && !reserved;
    }

    /**
     * Mas poderoso que el "Object.assing()" nstivo
     * @param {object} target 
     * @param {object} source 
     */
    const _ObjectAssing = function(target, source){
        Object.getOwnPropertyNames(source).forEach(function(name){
            Object.defineProperty(target, name, Object.getOwnPropertyDescriptor(source, name));
        });
        return target;
    }

    /**
     * @param {NodeList} nodeList 
     * @param {string} tagName 
     */
    const _render = function(nodeList, tagName, build){
        const builder = build || Components.get(tagName);
        for (let i = 0; i < nodeList.length; i++) {
            const node = nodeList[i];
            if(node[ISRENDER] === undefined){
                _ObjectAssing(node, builder);
                node.Builder();
                delete node.Builder;
                node[ISRENDER] = true;
                node.setAttribute(ISNC, '');
            }
        }
    }

    const _setSelector = function(tagName, rule){
        const split = rule.selectorText.split(',');
        const cssText = rule.cssText + '';
        const index = cssText.indexOf('{');
        let selectorText = '';

        for (let i = 0; i < split.length; i++){
            if(split[i].toLowerCase().indexOf(SELFTAG) > -1 )
                selectorText += split[i].replace(new RegExp(SELFTAG, 'i'), tagName) + (i === split.length - 1? '': ',');
            else
                selectorText += tagName + ' ' + split[i] + (i === split.length - 1? '': ',');
        }

        return selectorText + cssText.slice(index, cssText.length);
    }

    const _getMedias = function(tagName, mediaRule){

        let out = '';
        const rules = mediaRule.cssRules;
        out = '@media ' + mediaRule.media.mediaText + '{';

            for (let j = 0; j < rules.length; j++) {
                const rule = rules[j];
                if(rule.type !== 4)
                    out += _setSelector(tagName, rule);
                else
                    out += _getMedias(tagName, rule);  //Para un media query dentro de este media query
            }

        out += '}';

        return out;
    }

    const _insertRules = function(tagName, style){
        //tagName += '[' + ISNC + ']';
        let tempStyle = null;

        if(typeof style === 'string'){
            tempStyle = document.createElement('style');
            tempStyle.innerHTML = style;
        }
        else
            tempStyle = style;

        HTML.appendChild(tempStyle);

        const RulesFinal = STYLE.sheet.cssRules;
        const rules = tempStyle.sheet.cssRules;

        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            const last = RulesFinal.length - 1 < 0? 0 : RulesFinal.length - 1;
            if(rule.type !== 4)
                STYLE.sheet.insertRule(_setSelector(tagName, rule), last);
            else
                STYLE.sheet.insertRule(_getMedias(tagName, rule), last);
        }

        HTML.removeChild(tempStyle);
    }

    /**
     * @param {string} tagName nombre del nanoComponent
     * @param {object} object objeto plano que define las propiedades del nanoComponent
     */
    const define = function(tagName, object){

        if(!_isValidTagName(tagName))
            throw 'invalid tagName';

        object.Builder = typeof object.Builder === 'function'? object.Builder : function(){};

        const style = object.Style;

        if(!(typeof style === 'string' || style.constructor === HTMLStyleElement))
            delete object.Style;

        //Se guarda el nodeList vivo
        NCinside.set(tagName, document.getElementsByTagName(tagName));
        //Se guarda la definicion
        Components.set(tagName, object);

        const readyState = document.readyState;

        if(readyState === 'interactive' || readyState === 'complete'){
            if(style)
                _insertRules(tagName, style);

            render(tagName);
        }
    }

    /**
     * Genera un nanoComponent ya construido
     * @param {string} tagName 
     */
    const create = function(tagName){
        if(!Components.has(tagName))
            throw 'the nanoComponent <' + tagName + '> is not defined';

        const tag = document.createElement(tagName);
        _ObjectAssing(tag, Components.get(tagName));
        tag.Builder();
        delete tag.Builder;
        tag[ISRENDER] = true;
        tag.setAttribute(ISNC, '');
        return tag;
    }

    /**
     * @param {string|Element} tagName
     * @param {Element} container 
     */
    const render = function(tagName, container){

        //Renderizado de todos los nano Components que hay en el documento
        if(arguments.length === 0){
            NCinside.forEach(_render);
            return;
        }

        //Renderiza al Element aportado o los posibles nanoComponents que esten dentro del Element
        if(tagName instanceof Element){
            const name = tagName.tagName.toLowerCase();
            if(Components.has(name) && tagName[ISRENDER] === undefined){
                const builder = Components.get(name);
                _ObjectAssing(tagName, builder);
                tagName.Builder();
                delete tagName.Builder;
                tagName[ISRENDER] = true;
                tagName.setAttribute(ISNC, '');
            }
            else {
                Components.forEach(function(builder, name){
                    _render(tagName.getElementsByTagName(name), name, builder);
                });
            }
            return;
        }
        
        const exist = Components.has(tagName);
        const target = container instanceof Element;
        
        //Renderizado de los nano Components que estan dentro del container
        if(exist && target)
            _render(container.getElementsByTagName(tagName), tagName);
        //Renderizado de todos los nano Components correspondiente al tagName
        else if(exist)
            _render(NCinside.get(tagName), tagName);
        else
            throw 'the nanoComponent <' + tagName + '> is not defined';
    }

    let _initializer = new MutationObserver(function(){
        if(document.body){
            _initializer.disconnect();
            _initializer = undefined;
            HTML.appendChild(STYLE);
            //Seteo de los estilos de los nanoComponents
            Components.forEach(function(builder, tagName){
                render(tagName);
                const style = builder.Style;
                if(style)
                    _insertRules(tagName, style);
            });
        }
    });

    _initializer.observe(HTML, { childList: true, subtree: true });

    // Exposición
    window.nanoComponents = window.nC = {
        define: define,
        create: create,
        build: render
    }

})(window, document);