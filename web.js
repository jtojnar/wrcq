var tame = require('tamejs').runtime;
var __tame_defer_cb = null;
var __tame_fn_0 = function (__tame_k) {
    tame.setActiveCb (__tame_defer_cb);
    "use strict" ;
    
    var express = require ( 'express' ) ;
    var path = require ( 'path' ) ;
    var fs = require ( 'fs' ) ;
    
    var parseString = require ( 'xml2js' ) . parseString ;
    
    var passport = require ( 'passport' ) ,
    LocalStrategy = require ( 'passport-local' ) . Strategy ,
    crypto = require ( 'crypto' ) ,
    flash = require ( 'connect-flash' ) ,
    sha1 =
    function  (d) {
        return crypto . createHash ( 'sha1' ) . update ( d ) . digest ( 'hex' );
    }
    ;
    
    var _dbUri = process . env . HEROKU_POSTGRESQL_COPPER_URL ;
    
    passport . serializeUser (
    function  (user, done) {
        done ( null , user . id ) ;
    }
    ) ;
    passport . deserializeUser (
    function  (id, done) {
        pg . connect ( _dbUri ,
        function  (err, client) {
            if (err) {
                return done ( err , false );
            } else {
            }
            client . query ( 'select * from "user" where "id"=$1' , [ id ] ,
            function  (result) {
                if (result . rowCount == 0) {
                    return done ( err , false );
                } else {
                }
                var user = result . rows [ 0 ] ;
                return done ( err , user );
            }
            ) ;
        }
        ) ;
    }
    ) ;
    
    
    
    passport . use ( new LocalStrategy (
    function  (email, password, done) {
        process . nextTick (
        function  () {
            pg . connect ( _dbUri ,
            function  (err, client) {
                if (err) {
                    return done ( err );
                } else {
                }
                client . query ( 'select * from "user" where "email"=$1' , [ email ] ,
                function  (result) {
                    if (result . rowCount == 0) {
                        return done ( null , false , { message : 'Unknown user ' + email } );
                    } else {
                    }
                    var user = result . rows [ 0 ] ;
                    if (user . password != sha1 ( password +user . salt )) {
                        return done ( null , false , { message : 'Invalid password' } );
                    } else {
                    }
                    return done ( null , user );
                }
                ) ;
            }
            ) ;
        }
        ) ;
    }
    ) ) ;
    
    var hbs = require ( 'hbs' ) ;
    hbs . registerHelper ( 'date' ,
    function  (date) {
        return moment ( date ) . format ( 'L' );
    }
    ) ;
    
    var blocks = { } ;
    
    hbs . registerHelper ( 'extend' ,
    function  (name, context) {
        var block = blocks [ name ] ;
        if (! block) {
            block = blocks [ name ] = [ ] ;
        } else {
        }
        block . push ( context . fn ( this ) ) ;
    }
    ) ;
    
    hbs . registerHelper ( 'block' ,
    function  (name) {
        var val = ( blocks [ name ] || [ ] ) . join ( '\n' ) ;
        
        
        blocks [ name ] = [ ] ;
        return val;
    }
    ) ;
    
    hbs . registerHelper ( 'title' ,
    function  (value, context) {
        blocks . title = [ value ] ;
        return value;
    }
    ) ;
    
    hbs . registerHelper ( 'index' ,
    function  (index, context) {
        return index +1;
    }
    ) ;
    
    var genderclass = {
    'men' : 'M' ,
    'women' : 'W' ,
    'mixed' : 'X'
    } ;
    hbs . registerHelper ( 'genderclass' ,
    function  (gender, context) {
        return typeof genderclass [ gender ] === 'undefined' ? '' : genderclass [ gender ];
    }
    ) ;
    
    var ageclass = {
    'under20' : '20' ,
    'under23' : '23' ,
    'junior' : 'J' ,
    'open' : 'O' ,
    'veteran' : 'V' ,
    'superveteran' : 'SV' ,
    'ultraveteran' : 'UV'
    } ;
    hbs . registerHelper ( 'ageclass' ,
    function  (age, context) {
        return typeof ageclass [ age ] === 'undefined' ? '' : ageclass [ age ];
    }
    ) ;
    
    hbs . registerHelper ( 'each' ,
    function  (context, options) {
        var fn = options . fn , inverse = options . inverse ;
        var i = 0 , ret = "" , data ;
        if (options . data) {
            data = hbs . handlebars . createFrame ( options . data ) ;
        } else {
        }
        if (context && typeof context === 'object') {
            if (context instanceof Array) {
                 for (var j = context . length ; i <j ; i ++) {
                    if (data) {
                        data . index = i ;
                    } else {
                    }
                    if (i === ( j -1 )) {
                        data . last = true ;
                    } else {
                        data . last = false ;
                    }
                    ret = ret + fn ( context [ i ] , { data : data } ) ;
                }
            } else {
                var j = context . length ;
                 for (var key in context) {
                    if (context . hasOwnProperty ( key )) {
                        if (data) {
                            data . key = key ;
                        } else {
                        }
                        if (i === ( j -1 )) {
                            data . last = true ;
                        } else {
                            data . last = false ;
                        }
                        ret = ret + fn ( context [ key ] , { data : data } ) ;
                        i ++ ;
                    } else {
                    }
                }
            }
        } else {
        }
        if (i === 0) {
            ret = inverse ( this ) ;
        } else {
        }
        return ret;
    }
    ) ;
    
    hbs . registerHelper ( 'equals' ,
    function  (primary, secondary, options) {
        if (primary === secondary) {
            return options . fn ( this );
        } else {
            return options . inverse ( this );
        }
    }
    ) ;
    
    hbs . registerPartials ( path . join ( __dirname , 'view' , 'partial' ) ) ;
    
    var pg = require ( 'pg' ) ;
    var moment = require ( 'moment' ) ;
    
    var publicDir = path . join ( __dirname , 'public' ) ;
    
    var app = express ( ) ;
    
    
    app . configure (
    function  () {
        app . set ( 'views' , path . join ( __dirname , 'view' ) ) ;
        app . set ( 'port' , process . env . PORT || 5000 ) ;
        app . set ( 'view engine' , 'hbs' ) ;
        
        
        app . use ( express . cookieParser ( ) ) ;
        app . use ( express . bodyParser ( ) ) ;
        app . use ( express . methodOverride ( ) ) ;
        app . use ( express . session ( { secret : 'too much to bear' } ) ) ;
        app . use ( flash ( ) ) ;
        app . use ( passport . initialize ( ) ) ;
        app . use ( passport . session ( ) ) ;
        
        app . use ( express . compress ( ) ) ;
        app . use ( express . favicon ( ) ) ;
        app . use ( express . static ( publicDir ) ) ;
    }
    ) ;
    
    app . configure ( 'development' ,
    function  () {
        app . use ( express . logger ( ) ) ;
    }
    ) ;
    
    
    app . get ( '/' ,
    function  (req, res) {
        pg . connect ( _dbUri ,
        function  (err, client) {
            var __tame_defer_cb = tame.findDeferCb ([err, client]);
            tame.setActiveCb (__tame_defer_cb);
            var __tame_this = this;
            var __tame_fn_1 = function (__tame_k) {
                tame.setActiveCb (__tame_defer_cb);
                var row, updates;
                var __tame_fn_2 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_defers = new tame.Deferrals (__tame_k);
                    var __tame_fn_3 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        client . query ( 'select * from update order by timestamp desc limit 10' ,
                        __tame_defers.defer ( { 
                            assign_fn : 
                                function () {
                                    row = arguments[0];
                                    updates = arguments[1];
                                }
                                ,
                            parent_cb : __tame_defer_cb,
                            line : 195,
                            file : "web.tjs"
                        } )
                        ) ;
                        tame.callChain([__tame_k]);
                        tame.setActiveCb (null);
                    };
                    __tame_fn_3(tame.end);
                    __tame_defers._fulfill();
                    tame.setActiveCb (null);
                };
                var row, events;
                var __tame_fn_4 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_defers = new tame.Deferrals (__tame_k);
                    var __tame_fn_5 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        client . query ( 'select * from event order by start asc' ,
                        __tame_defers.defer ( { 
                            assign_fn : 
                                function () {
                                    row = arguments[0];
                                    events = arguments[1];
                                }
                                ,
                            parent_cb : __tame_defer_cb,
                            line : 196,
                            file : "web.tjs"
                        } )
                        ) ;
                        tame.callChain([__tame_k]);
                        tame.setActiveCb (null);
                    };
                    __tame_fn_5(tame.end);
                    __tame_defers._fulfill();
                    tame.setActiveCb (null);
                };
                var __tame_fn_6 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    res . render ( 'index' , { updates : updates . rows , events : events . rows , identity : req . user } ) ;
                    tame.callChain([__tame_k]);
                    tame.setActiveCb (null);
                };
                tame.callChain([__tame_fn_2, __tame_fn_4, __tame_fn_6, __tame_k]);
                tame.setActiveCb (null);
            };
            tame.callChain([__tame_fn_1, __tame_k]);
            tame.setActiveCb (null);
        }
        ) ;
    }
    ) ;
    
    app . get ( '/events' ,
    function  (req, res) {
        res . render ( 'events' , { identity : req . user } ) ;
    }
    ) ;
    function addMembers (members, row) {
        row . members = [ ] ;
         for (var i = 0 ; i < members . length ; i ++) {
            if (members [ i ] . team_id == row . id) {
                row . members . push ( members [ i ] ) ;
            } else {
            }
        }
        ;
    }
    var categories = { MO : { age : 'open' , gender : 'men' } , XO : { age : 'open' , gender : 'mixed' } , WO : { age : 'open' , gender : 'women' } , MV : { age : 'veteran' , gender : 'men' } , XV : { age : 'veteran' , gender : 'mixed' } , WV : { age : 'veteran' , gender : 'women' } , MSV : { age : 'superveteran' , gender : 'men' } , XSV : { age : 'superveteran' , gender : 'mixed' } , WSV : { age : 'superveteran' , gender : 'women' } , MUV : { age : 'ultraveteran' , gender : 'men' } , XUV : { age : 'ultraveteran' , gender : 'mixed' } , WUV : { age : 'ultraveteran' , gender : 'women' } , MJ : { age : 'junior' , gender : 'men' } , XJ : { age : 'junior' , gender : 'mixed' } , WJ : { age : 'junior' , gender : 'women' } , M20 : { age : 'under20' , gender : 'men' } , X20 : { age : 'under20' , gender : 'mixed' } , W20 : { age : 'under20' , gender : 'women' } , M23 : { age : 'under23' , gender : 'men' } , X23 : { age : 'under23' , gender : 'mixed' } , W23 : { age : 'under23' , gender : 'women' } } ;
    
    app . get ( '/results' ,
    function  (req, res) {
        var event = { id : 3 , name : 'WRC 1998' } ;
        pg . connect ( _dbUri ,
        function  (err, client) {
            var __tame_defer_cb = tame.findDeferCb ([err, client]);
            tame.setActiveCb (__tame_defer_cb);
            var __tame_this = this;
            var __tame_fn_7 = function (__tame_k) {
                tame.setActiveCb (__tame_defer_cb);
                var row, members;
                var __tame_fn_8 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_defers = new tame.Deferrals (__tame_k);
                    var __tame_fn_9 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        client . query ( 'select * from member where event_id=$1' , [ event . id ] ,
                        __tame_defers.defer ( { 
                            assign_fn : 
                                function () {
                                    row = arguments[0];
                                    members = arguments[1];
                                }
                                ,
                            parent_cb : __tame_defer_cb,
                            line : 225,
                            file : "web.tjs"
                        } )
                        ) ;
                        tame.callChain([__tame_k]);
                        tame.setActiveCb (null);
                    };
                    __tame_fn_9(tame.end);
                    __tame_defers._fulfill();
                    tame.setActiveCb (null);
                };
                var __tame_fn_31 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    members = members . rows ;
                    var moquery = client . query ( 'select * from team where event_id=$1 and gender=$2 and age=$3 limit 3' , [ event . id , 'men' , 'open' ] ,
                    function  () {
                    }
                    ) ;
                    moquery . on ( 'row' ,
                    function  (row) {
                        addMembers ( members , row ) ;
                    }
                    ) ;
                    var __tame_fn_10 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        var mo;
                        var __tame_fn_11 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                            var __tame_defers = new tame.Deferrals (__tame_k);
                            var __tame_fn_12 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                moquery . on ( 'end' ,
                                __tame_defers.defer ( { 
                                    assign_fn : 
                                        function () {
                                            mo = arguments[0];
                                        }
                                        ,
                                    parent_cb : __tame_defer_cb,
                                    line : 229,
                                    file : "web.tjs"
                                } )
                                ) ;
                                tame.callChain([__tame_k]);
                                tame.setActiveCb (null);
                            };
                            __tame_fn_12(tame.end);
                            __tame_defers._fulfill();
                            tame.setActiveCb (null);
                        };
                        var __tame_fn_30 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                            var xoquery = client . query ( 'select * from team where event_id=$1 and gender=$2 and age=$3 limit 3' , [ event . id , 'mixed' , 'open' ] ,
                            function  () {
                            }
                            ) ;
                            xoquery . on ( 'row' ,
                            function  (row) {
                                addMembers ( members , row ) ;
                            }
                            ) ;
                            var __tame_fn_13 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                var xo;
                                var __tame_fn_14 = function (__tame_k) {
                                    tame.setActiveCb (__tame_defer_cb);
                                    var __tame_defers = new tame.Deferrals (__tame_k);
                                    var __tame_fn_15 = function (__tame_k) {
                                        tame.setActiveCb (__tame_defer_cb);
                                        xoquery . on ( 'end' ,
                                        __tame_defers.defer ( { 
                                            assign_fn : 
                                                function () {
                                                    xo = arguments[0];
                                                }
                                                ,
                                            parent_cb : __tame_defer_cb,
                                            line : 232,
                                            file : "web.tjs"
                                        } )
                                        ) ;
                                        tame.callChain([__tame_k]);
                                        tame.setActiveCb (null);
                                    };
                                    __tame_fn_15(tame.end);
                                    __tame_defers._fulfill();
                                    tame.setActiveCb (null);
                                };
                                var __tame_fn_29 = function (__tame_k) {
                                    tame.setActiveCb (__tame_defer_cb);
                                    var woquery = client . query ( 'select * from team where event_id=$1 and gender=$2 and age=$3 limit 3' , [ event . id , 'women' , 'open' ] ,
                                    function  () {
                                    }
                                    ) ;
                                    woquery . on ( 'row' ,
                                    function  (row) {
                                        addMembers ( members , row ) ;
                                    }
                                    ) ;
                                    var __tame_fn_16 = function (__tame_k) {
                                        tame.setActiveCb (__tame_defer_cb);
                                        var wo;
                                        var __tame_fn_17 = function (__tame_k) {
                                            tame.setActiveCb (__tame_defer_cb);
                                            var __tame_defers = new tame.Deferrals (__tame_k);
                                            var __tame_fn_18 = function (__tame_k) {
                                                tame.setActiveCb (__tame_defer_cb);
                                                woquery . on ( 'end' ,
                                                __tame_defers.defer ( { 
                                                    assign_fn : 
                                                        function () {
                                                            wo = arguments[0];
                                                        }
                                                        ,
                                                    parent_cb : __tame_defer_cb,
                                                    line : 235,
                                                    file : "web.tjs"
                                                } )
                                                ) ;
                                                tame.callChain([__tame_k]);
                                                tame.setActiveCb (null);
                                            };
                                            __tame_fn_18(tame.end);
                                            __tame_defers._fulfill();
                                            tame.setActiveCb (null);
                                        };
                                        var __tame_fn_28 = function (__tame_k) {
                                            tame.setActiveCb (__tame_defer_cb);
                                            var counters = { all : 0 , MO : 0 , XO : 0 , WO : 0 , MV : 0 , XV : 0 , WV : 0 , MSV : 0 , XSV : 0 , WSV : 0 , MUV : 0 , XUV : 0 , WUV : 0 , MJ : 0 , XJ : 0 , WJ : 0 , M20 : 0 , X20 : 0 , W20 : 0 , M23 : 0 , X23 : 0 , W23 : 0 } ;
                                            
                                            var teamquery = client . query ( 'select * from team where event_id=$1' , [ event . id ] ) ;
                                            teamquery . on ( 'row' ,
                                            function  (row) {
                                                addMembers ( members , row ) ;
                                            }
                                            ) ;
                                            teamquery . on ( 'row' ,
                                            function  (row, result) {
                                                if (row . duration == 24) {
                                                    row . duration = '' ;
                                                    var gender = hbs . handlebars . helpers . genderclass ( row . gender ) ;
                                                    if (row . age == 'ultraveteran') {
                                                        row [ gender + 'UV' ] = ++counters [ gender + 'UV' ] ;
                                                        row [ gender + 'SV' ] = ++counters [ gender + 'SV' ] ;
                                                        row [ gender + 'V' ] = ++counters [ gender + 'V' ] ;
                                                        row [ gender + 'O' ] = ++counters [ gender + 'O' ] ;
                                                    } else {
                                                        if (row . age == 'superveteran') {
                                                            row [ gender + 'SV' ] = ++counters [ gender + 'SV' ] ;
                                                            row [ gender + 'V' ] = ++counters [ gender + 'V' ] ;
                                                            row [ gender + 'O' ] = ++counters [ gender + 'O' ] ;
                                                        } else {
                                                            if (row . age == 'veteran') {
                                                                row [ gender + 'V' ] = ++counters [ gender + 'V' ] ;
                                                                row [ gender + 'O' ] = ++counters [ gender + 'O' ] ;
                                                            } else {
                                                                if (row . age == 'open') {
                                                                    row [ gender + 'O' ] = ++counters [ gender + 'O' ] ;
                                                                } else {
                                                                    if (row . age == 'junior') {
                                                                        row [ gender + 'J' ] = ++counters [ gender + 'J' ] ;
                                                                    } else {
                                                                        if (row . age == 'under23') {
                                                                            row [ gender + '23' ] = ++counters [ gender + '23' ] ;
                                                                        } else {
                                                                            if (row . age == 'under20') {
                                                                                row [ gender + '20' ] = ++counters [ gender + '20' ] ;
                                                                            } else {
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                } else {
                                                }
                                                row [ 'place' ] = ++counters [ 'all' ] ;
                                                if (! req . query . category || ( req . query . category && categories [ req . query . category ] . gender === row . gender && categories [ req . query . category ] . age === row . age )) {
                                                    result . addRow ( row ) ;
                                                } else {
                                                }
                                            }
                                            ) ;
                                            var __tame_fn_19 = function (__tame_k) {
                                                tame.setActiveCb (__tame_defer_cb);
                                                var teams;
                                                var __tame_fn_20 = function (__tame_k) {
                                                    tame.setActiveCb (__tame_defer_cb);
                                                    var __tame_defers = new tame.Deferrals (__tame_k);
                                                    var __tame_fn_21 = function (__tame_k) {
                                                        tame.setActiveCb (__tame_defer_cb);
                                                        teamquery . on ( 'end' ,
                                                        __tame_defers.defer ( { 
                                                            assign_fn : 
                                                                function () {
                                                                    teams = arguments[0];
                                                                }
                                                                ,
                                                            parent_cb : __tame_defer_cb,
                                                            line : 274,
                                                            file : "web.tjs"
                                                        } )
                                                        ) ;
                                                        tame.callChain([__tame_k]);
                                                        tame.setActiveCb (null);
                                                    };
                                                    __tame_fn_21(tame.end);
                                                    __tame_defers._fulfill();
                                                    tame.setActiveCb (null);
                                                };
                                                var __tame_fn_27 = function (__tame_k) {
                                                    tame.setActiveCb (__tame_defer_cb);
                                                    var validCategories = [ ] , activeCategory = null ;
                                                    var __tame_fn_22 = function (__tame_k) {
                                                        tame.setActiveCb (__tame_defer_cb);
                                                        var __tame_fn_23 = function (__tame_k) {
                                                            tame.setActiveCb (__tame_defer_cb);
                                                             for (var key in categories) {
                                                                if (categories . hasOwnProperty ( key ) && counters [ key ] > 0) {
                                                                    validCategories . push ( key ) ;
                                                                    if (key === req . query . category) {
                                                                        activeCategory = key ;
                                                                    } else {
                                                                    }
                                                                } else {
                                                                }
                                                            }
                                                            tame.callChain([__tame_k]);
                                                            tame.setActiveCb (null);
                                                        };
                                                        var __tame_fn_24 = function (__tame_k) {
                                                            tame.setActiveCb (__tame_defer_cb);
                                                            var __tame_fn_25 = function (__tame_k) {
                                                                tame.setActiveCb (__tame_defer_cb);
                                                                res . redirect ( '/results' ) ;
                                                                tame.callChain([__tame_k]);
                                                                tame.setActiveCb (null);
                                                            };
                                                            if (req . query . category != activeCategory) {
                                                                tame.callChain([__tame_fn_25, __tame_k]);
                                                            } else {
                                                                tame.callChain([__tame_k]);
                                                            }
                                                            tame.setActiveCb (null);
                                                        };
                                                        var __tame_fn_26 = function (__tame_k) {
                                                            tame.setActiveCb (__tame_defer_cb);
                                                            res . render ( 'results' , {
                                                            title : 'Results of ' + event . name ,
                                                            event : event ,
                                                            teams : teams . rows ,
                                                            mo : { teams : mo . rows } ,
                                                            xo : { teams : xo . rows } ,
                                                            wo : { teams : wo . rows } ,
                                                            identity : req . user ,
                                                            isMO : counters . MO , isXO : counters . XO , isWO : counters . WO , isMV : counters . MV , isXV : counters . XV , isWV : counters . WV , isMSV : counters . MSV , isXSV : counters . XSV , isWSV : counters . WSV , isMUV : counters . MUV , isXUV : counters . XUV , isWUV : counters . WUV , isMJ : counters . MJ , isXJ : counters . XJ , isWJ : counters . WJ , isM20 : counters . M20 , isX20 : counters . X20 , isW20 : counters . W20 , isM23 : counters . M23 , isX23 : counters . X23 , isW23 : counters . W23 ,
                                                            activeCategory : activeCategory ,
                                                            categories : validCategories
                                                            } ) ;
                                                            tame.callChain([__tame_k]);
                                                            tame.setActiveCb (null);
                                                        };
                                                        tame.callChain([__tame_fn_23, __tame_fn_24, __tame_fn_26, __tame_k]);
                                                        tame.setActiveCb (null);
                                                    };
                                                    tame.callChain([__tame_fn_22, __tame_k]);
                                                    tame.setActiveCb (null);
                                                };
                                                tame.callChain([__tame_fn_20, __tame_fn_27, __tame_k]);
                                                tame.setActiveCb (null);
                                            };
                                            tame.callChain([__tame_fn_19, __tame_k]);
                                            tame.setActiveCb (null);
                                        };
                                        tame.callChain([__tame_fn_17, __tame_fn_28, __tame_k]);
                                        tame.setActiveCb (null);
                                    };
                                    tame.callChain([__tame_fn_16, __tame_k]);
                                    tame.setActiveCb (null);
                                };
                                tame.callChain([__tame_fn_14, __tame_fn_29, __tame_k]);
                                tame.setActiveCb (null);
                            };
                            tame.callChain([__tame_fn_13, __tame_k]);
                            tame.setActiveCb (null);
                        };
                        tame.callChain([__tame_fn_11, __tame_fn_30, __tame_k]);
                        tame.setActiveCb (null);
                    };
                    tame.callChain([__tame_fn_10, __tame_k]);
                    tame.setActiveCb (null);
                };
                tame.callChain([__tame_fn_8, __tame_fn_31, __tame_k]);
                tame.setActiveCb (null);
            };
            tame.callChain([__tame_fn_7, __tame_k]);
            tame.setActiveCb (null);
        }
        ) ;
    }
    ) ;
    
    app . get ( '/login' ,
    function  (req, res) {
        res . render ( 'login' , { identity : req . user , message : req . flash ( 'error' ) } ) ;
    }
    ) ;
    
    app . post ( '/login' , passport . authenticate ( 'local' , { failureRedirect : '/login' , failureFlash : true } ) ,
    function  (req, res) {
        res . redirect ( '/' ) ;
    }
    ) ;
    
    app . get ( '/logout' ,
    function  (req, res) {
        req . logout ( ) ;
        res . redirect ( '/' ) ;
    }
    ) ;
    
    app . listen ( app . get ( 'port' ) ,
    function  () {
        console . log ( 'Started app on port %d' , app . get ( 'port' ) ) ;
    }
    ) ;
    tame.callChain([__tame_k]);
    tame.setActiveCb (null);
};
__tame_fn_0 (tame.end);