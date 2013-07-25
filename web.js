var tame = require('tamejs').runtime;
var __tame_defer_cb = null;
var __tame_fn_48 = function (__tame_k) {
    tame.setActiveCb (__tame_defer_cb);
    "use strict" ;
    
    var express = require ( 'express' ) ;
    var path = require ( 'path' ) ;
    var fs = require ( 'fs' ) ;
    var url = require ( 'url' ) ;
    
    var parseString = require ( 'xml2js' ) . parseString ;
    
    var passport = require ( 'passport' ) ;
    var LocalStrategy = require ( 'passport-local' ) . Strategy ;
    var crypto = require ( 'crypto' ) ;
    var flash = require ( 'connect-flash' ) ;
    var sha1 =
    function  (d) {
        return crypto . createHash ( 'sha1' ) . update ( d ) . digest ( 'hex' );
    }
    ;
    function increment (obj, alpha, beta) {
        if (! obj . hasOwnProperty ( alpha )) {
            obj [ alpha ] = { } ;
        } else {
        }
        if (! obj [ alpha ] . hasOwnProperty ( beta )) {
            obj [ alpha ] [ beta ] = 0 ;
        } else {
        }
        return ++obj [ alpha ] [ beta ];
    }
    var _dbUri = process . env . HEROKU_POSTGRESQL_COPPER_URL ;
    
    passport . serializeUser (
    function  (user, done) {
        done ( null , user . id ) ;
    }
    ) ;
    passport . deserializeUser (
    function  (id, done) {
        pg . connect ( _dbUri ,
        function  (err, client, pgdone) {
            var __tame_defer_cb = tame.findDeferCb ([err, client, pgdone]);
            tame.setActiveCb (__tame_defer_cb);
            var __tame_this = this;
            var __tame_fn_49 = function (__tame_k) {
                tame.setActiveCb (__tame_defer_cb);
                var __tame_fn_50 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_fn_52 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        pgdone ( ) ;
                        var __tame_fn_51 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                                done ( err , false );
                                tame.callChain([tame.end, __tame_k]);
                            tame.setActiveCb (null);
                        };
                        tame.callChain([__tame_fn_51, __tame_k]);
                        tame.setActiveCb (null);
                    };
                    if (err) {
                        tame.callChain([__tame_fn_52, __tame_k]);
                    } else {
                        tame.callChain([__tame_k]);
                    }
                    tame.setActiveCb (null);
                };
                var __tame_fn_53 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_defers = new tame.Deferrals (__tame_k);
                    var __tame_fn_54 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        client . query ( 'select * from "user" where "id"=$1' , [ id ] ,
                        __tame_defers.defer ( { 
                            assign_fn : 
                                function () {
                                    row = arguments[0];
                                    result = arguments[1];
                                }
                                ,
                            parent_cb : __tame_defer_cb,
                            line : 40,
                            file : "web.tjs"
                        } )
                        ) ;
                        tame.callChain([__tame_k]);
                        tame.setActiveCb (null);
                    };
                    __tame_fn_54(tame.end);
                    __tame_defers._fulfill();
                    tame.setActiveCb (null);
                };
                var __tame_fn_60 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    pgdone ( ) ;
                    var __tame_fn_55 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        var __tame_fn_56 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                            var __tame_fn_57 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                    done ( err , false );
                                    tame.callChain([tame.end, __tame_k]);
                                tame.setActiveCb (null);
                            };
                            if (result . rowCount == 0) {
                                tame.callChain([__tame_fn_57, __tame_k]);
                            } else {
                                tame.callChain([__tame_k]);
                            }
                            tame.setActiveCb (null);
                        };
                        var __tame_fn_59 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                            var user = result . rows [ 0 ] ;
                            var __tame_fn_58 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                    done ( err , user );
                                    tame.callChain([tame.end, __tame_k]);
                                tame.setActiveCb (null);
                            };
                            tame.callChain([__tame_fn_58, __tame_k]);
                            tame.setActiveCb (null);
                        };
                        tame.callChain([__tame_fn_56, __tame_fn_59, __tame_k]);
                        tame.setActiveCb (null);
                    };
                    tame.callChain([__tame_fn_55, __tame_k]);
                    tame.setActiveCb (null);
                };
                tame.callChain([__tame_fn_50, __tame_fn_53, __tame_fn_60, __tame_k]);
                tame.setActiveCb (null);
            };
            tame.callChain([__tame_fn_49, __tame_k]);
            tame.setActiveCb (null);
        }
        ) ;
    }
    ) ;
    
    
    
    passport . use ( new LocalStrategy (
    function  (email, password, done) {
        process . nextTick (
        function  () {
            pg . connect ( _dbUri ,
            function  (err, client, pgdone) {
                var __tame_defer_cb = tame.findDeferCb ([err, client, pgdone]);
                tame.setActiveCb (__tame_defer_cb);
                var __tame_this = this;
                var __tame_fn_61 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_fn_62 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        var __tame_fn_64 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                            pgdone ( ) ;
                            var __tame_fn_63 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                    done ( err );
                                    tame.callChain([tame.end, __tame_k]);
                                tame.setActiveCb (null);
                            };
                            tame.callChain([__tame_fn_63, __tame_k]);
                            tame.setActiveCb (null);
                        };
                        if (err) {
                            tame.callChain([__tame_fn_64, __tame_k]);
                        } else {
                            tame.callChain([__tame_k]);
                        }
                        tame.setActiveCb (null);
                    };
                    var __tame_fn_65 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        var __tame_defers = new tame.Deferrals (__tame_k);
                        var __tame_fn_66 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                            client . query ( 'select * from "user" where "email"=$1' , [ email ] ,
                            __tame_defers.defer ( { 
                                assign_fn : 
                                    function () {
                                        row = arguments[0];
                                        result = arguments[1];
                                    }
                                    ,
                                parent_cb : __tame_defer_cb,
                                line : 61,
                                file : "web.tjs"
                            } )
                            ) ;
                            tame.callChain([__tame_k]);
                            tame.setActiveCb (null);
                        };
                        __tame_fn_66(tame.end);
                        __tame_defers._fulfill();
                        tame.setActiveCb (null);
                    };
                    var __tame_fn_75 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        pgdone ( ) ;
                        var __tame_fn_67 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                            var __tame_fn_68 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                var __tame_fn_69 = function (__tame_k) {
                                    tame.setActiveCb (__tame_defer_cb);
                                        done ( null , false , { message : 'Unknown user ' + email } );
                                        tame.callChain([tame.end, __tame_k]);
                                    tame.setActiveCb (null);
                                };
                                if (result . rowCount == 0) {
                                    tame.callChain([__tame_fn_69, __tame_k]);
                                } else {
                                    tame.callChain([__tame_k]);
                                }
                                tame.setActiveCb (null);
                            };
                            var __tame_fn_74 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                var user = result . rows [ 0 ] ;
                                var __tame_fn_70 = function (__tame_k) {
                                    tame.setActiveCb (__tame_defer_cb);
                                    var __tame_fn_71 = function (__tame_k) {
                                        tame.setActiveCb (__tame_defer_cb);
                                        var __tame_fn_72 = function (__tame_k) {
                                            tame.setActiveCb (__tame_defer_cb);
                                                done ( null , false , { message : 'Invalid password' } );
                                                tame.callChain([tame.end, __tame_k]);
                                            tame.setActiveCb (null);
                                        };
                                        if (user . password != sha1 ( password +user . salt )) {
                                            tame.callChain([__tame_fn_72, __tame_k]);
                                        } else {
                                            tame.callChain([__tame_k]);
                                        }
                                        tame.setActiveCb (null);
                                    };
                                    var __tame_fn_73 = function (__tame_k) {
                                        tame.setActiveCb (__tame_defer_cb);
                                            done ( null , user );
                                            tame.callChain([tame.end, __tame_k]);
                                        tame.setActiveCb (null);
                                    };
                                    tame.callChain([__tame_fn_71, __tame_fn_73, __tame_k]);
                                    tame.setActiveCb (null);
                                };
                                tame.callChain([__tame_fn_70, __tame_k]);
                                tame.setActiveCb (null);
                            };
                            tame.callChain([__tame_fn_68, __tame_fn_74, __tame_k]);
                            tame.setActiveCb (null);
                        };
                        tame.callChain([__tame_fn_67, __tame_k]);
                        tame.setActiveCb (null);
                    };
                    tame.callChain([__tame_fn_62, __tame_fn_65, __tame_fn_75, __tame_k]);
                    tame.setActiveCb (null);
                };
                tame.callChain([__tame_fn_61, __tame_k]);
                tame.setActiveCb (null);
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
    function pad (number, digits) {
        number = "" + number ;
        while (number . length < digits) {
            number = "0" + number ;
        }
        return number;
    }
    hbs . registerHelper ( 'time' ,
    function  (time, context) {
        return pad ( ( time . days ||0 ) *24 + ( time . hours ||0 ) , 2 ) + ':' + pad ( time . minutes ||0 , 2 ) + ':' + pad ( time . seconds ||0 , 2 );
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
        function  (err, client, done) {
            var __tame_defer_cb = tame.findDeferCb ([err, client, done]);
            tame.setActiveCb (__tame_defer_cb);
            var __tame_this = this;
            var __tame_fn_76 = function (__tame_k) {
                tame.setActiveCb (__tame_defer_cb);
                var row, updates;
                var __tame_fn_77 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_defers = new tame.Deferrals (__tame_k);
                    var __tame_fn_78 = function (__tame_k) {
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
                            line : 229,
                            file : "web.tjs"
                        } )
                        ) ;
                        tame.callChain([__tame_k]);
                        tame.setActiveCb (null);
                    };
                    __tame_fn_78(tame.end);
                    __tame_defers._fulfill();
                    tame.setActiveCb (null);
                };
                var row, events;
                var __tame_fn_79 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_defers = new tame.Deferrals (__tame_k);
                    var __tame_fn_80 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        client . query ( 'select * from event where level=\'world\' order by start asc' ,
                        __tame_defers.defer ( { 
                            assign_fn : 
                                function () {
                                    row = arguments[0];
                                    events = arguments[1];
                                }
                                ,
                            parent_cb : __tame_defer_cb,
                            line : 230,
                            file : "web.tjs"
                        } )
                        ) ;
                        tame.callChain([__tame_k]);
                        tame.setActiveCb (null);
                    };
                    __tame_fn_80(tame.end);
                    __tame_defers._fulfill();
                    tame.setActiveCb (null);
                };
                var __tame_fn_81 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    done ( ) ;
                    res . render ( 'index' , { updates : updates . rows , events : events . rows , identity : req . user } ) ;
                    tame.callChain([__tame_k]);
                    tame.setActiveCb (null);
                };
                tame.callChain([__tame_fn_77, __tame_fn_79, __tame_fn_81, __tame_k]);
                tame.setActiveCb (null);
            };
            tame.callChain([__tame_fn_76, __tame_k]);
            tame.setActiveCb (null);
        }
        ) ;
    }
    ) ;
    
    app . get ( '/events' ,
    function  (req, res) {
        pg . connect ( _dbUri ,
        function  (err, client, done) {
            var __tame_defer_cb = tame.findDeferCb ([err, client, done]);
            tame.setActiveCb (__tame_defer_cb);
            var __tame_this = this;
            var __tame_fn_82 = function (__tame_k) {
                tame.setActiveCb (__tame_defer_cb);
                var row, events;
                var __tame_fn_83 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_defers = new tame.Deferrals (__tame_k);
                    var __tame_fn_84 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        client . query ( 'with latest as (select *, row_number() over(partition by level order by start desc) as rk from event) select * from latest left join (select event_id from team group by event_id) as team on team.event_id = latest.id where rk <= 2' ,
                        __tame_defers.defer ( { 
                            assign_fn : 
                                function () {
                                    row = arguments[0];
                                    events = arguments[1];
                                }
                                ,
                            parent_cb : __tame_defer_cb,
                            line : 238,
                            file : "web.tjs"
                        } )
                        ) ;
                        tame.callChain([__tame_k]);
                        tame.setActiveCb (null);
                    };
                    __tame_fn_84(tame.end);
                    __tame_defers._fulfill();
                    tame.setActiveCb (null);
                };
                var __tame_fn_85 = function (__tame_k) {
                    tame.setActiveCb (__tame_defer_cb);
                    done ( ) ;
                    res . render ( 'events' , { events : events . rows , identity : req . user } ) ;
                    tame.callChain([__tame_k]);
                    tame.setActiveCb (null);
                };
                tame.callChain([__tame_fn_83, __tame_fn_85, __tame_k]);
                tame.setActiveCb (null);
            };
            tame.callChain([__tame_fn_82, __tame_k]);
            tame.setActiveCb (null);
        }
        ) ;
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
    var categoriesToObject = { MO : { age : 'open' , gender : 'men' } , XO : { age : 'open' , gender : 'mixed' } , WO : { age : 'open' , gender : 'women' } , MV : { age : 'veteran' , gender : 'men' } , XV : { age : 'veteran' , gender : 'mixed' } , WV : { age : 'veteran' , gender : 'women' } , MSV : { age : 'superveteran' , gender : 'men' } , XSV : { age : 'superveteran' , gender : 'mixed' } , WSV : { age : 'superveteran' , gender : 'women' } , MUV : { age : 'ultraveteran' , gender : 'men' } , XUV : { age : 'ultraveteran' , gender : 'mixed' } , WUV : { age : 'ultraveteran' , gender : 'women' } , MJ : { age : 'junior' , gender : 'men' } , XJ : { age : 'junior' , gender : 'mixed' } , WJ : { age : 'junior' , gender : 'women' } , M20 : { age : 'under20' , gender : 'men' } , X20 : { age : 'under20' , gender : 'mixed' } , W20 : { age : 'under20' , gender : 'women' } , M23 : { age : 'under23' , gender : 'men' } , X23 : { age : 'under23' , gender : 'mixed' } , W23 : { age : 'under23' , gender : 'women' } } ;
    
    
    var categoryInheritance = { 'ultraveteran' : 'superveteran' , 'superveteran' : 'veteran' , 'veteran' : 'open' } ;
    var categoryInheritanceReverse = { } ;
    var __tame_fn_0 = function (__tame_k) {
        tame.setActiveCb (__tame_defer_cb);
        var __tame_fn_1 = function (__tame_k) {
            tame.setActiveCb (__tame_defer_cb);
             for (var cat in categoryInheritance) {
                if (categoryInheritance . hasOwnProperty ( cat )) {
                    categoryInheritanceReverse [ categoryInheritance [ cat ] ] = cat ;
                } else {
                }
            }
            tame.callChain([__tame_k]);
            tame.setActiveCb (null);
        };
        var __tame_fn_2 = function (__tame_k) {
            tame.setActiveCb (__tame_defer_cb);
            function getCategoryDescendants (gender, age, reverse) {
                if (reverse) {
                    var categories = categoryInheritanceReverse ;
                } else {
                    var categories = categoryInheritance ;
                }
                var ret = [ ] ;
                ret . push ( hbs . handlebars . helpers . genderclass ( gender ) +hbs . handlebars . helpers . ageclass ( age ) ) ;
                if (categories . hasOwnProperty ( age )) {
                    ret . push . apply ( ret , getCategoryDescendants ( gender , categories [ age ] , reverse ) ) ;
                } else {
                }
                return ret;
            }
            function getAgeDescendants (age, reverse) {
                if (reverse) {
                    var categories = categoryInheritanceReverse ;
                } else {
                    var categories = categoryInheritance ;
                }
                var ret = [ ] ;
                ret . push ( age ) ;
                if (categories . hasOwnProperty ( age )) {
                    ret . push . apply ( ret , getAgeDescendants ( categories [ age ] , reverse ) ) ;
                } else {
                }
                return ret;
            }
            app . get ( '/events/:event/results' ,
            function  (req, res) {
                pg . connect ( _dbUri ,
                function  (err, client, done) {
                    var __tame_defer_cb = tame.findDeferCb ([err, client, done]);
                    tame.setActiveCb (__tame_defer_cb);
                    var __tame_this = this;
                    var __tame_fn_3 = function (__tame_k) {
                        tame.setActiveCb (__tame_defer_cb);
                        var row, eventdata;
                        var __tame_fn_4 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                            var __tame_defers = new tame.Deferrals (__tame_k);
                            var __tame_fn_5 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                client . query ( 'select * from event where slug=$1 limit 1' , [ req . params . event ] ,
                                __tame_defers.defer ( { 
                                    assign_fn : 
                                        function () {
                                            row = arguments[0];
                                            eventdata = arguments[1];
                                        }
                                        ,
                                    parent_cb : __tame_defer_cb,
                                    line : 300,
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
                            var __tame_fn_8 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                done ( ) ;
                                res . status ( 404 ) ;
                                res . render ( 'error/404' , { body : 'Sorry, this event is not in our database, we may be working on it.' } ) ;
                                var __tame_fn_7 = function (__tame_k) {
                                    tame.setActiveCb (__tame_defer_cb);
                                        ;
                                        tame.callChain([tame.end, __tame_k]);
                                    tame.setActiveCb (null);
                                };
                                tame.callChain([__tame_fn_7, __tame_k]);
                                tame.setActiveCb (null);
                            };
                            if (eventdata . rows . length == 0) {
                                tame.callChain([__tame_fn_8, __tame_k]);
                            } else {
                                tame.callChain([__tame_k]);
                            }
                            tame.setActiveCb (null);
                        };
                        var __tame_fn_47 = function (__tame_k) {
                            tame.setActiveCb (__tame_defer_cb);
                            var event = eventdata . rows [ 0 ] ;
                            var __tame_fn_9 = function (__tame_k) {
                                tame.setActiveCb (__tame_defer_cb);
                                var row, members;
                                var __tame_fn_10 = function (__tame_k) {
                                    tame.setActiveCb (__tame_defer_cb);
                                    var __tame_defers = new tame.Deferrals (__tame_k);
                                    var __tame_fn_11 = function (__tame_k) {
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
                                            line : 309,
                                            file : "web.tjs"
                                        } )
                                        ) ;
                                        tame.callChain([__tame_k]);
                                        tame.setActiveCb (null);
                                    };
                                    __tame_fn_11(tame.end);
                                    __tame_defers._fulfill();
                                    tame.setActiveCb (null);
                                };
                                var __tame_fn_46 = function (__tame_k) {
                                    tame.setActiveCb (__tame_defer_cb);
                                    members = members . rows ;
                                    var openCategories = getAgeDescendants ( 'open' , true ) . join ( '\',\'' ) ;
                                    var moquery = client . query ( 'select * from team where event_id=$1 and gender=$2 and age in (\'' +openCategories+ '\') order by status=\'finished\' desc, score desc, time asc limit 3' , [ event . id , 'men' ] ,
                                    function  () {
                                    }
                                    ) ;
                                    moquery . on ( 'row' ,
                                    function  (row) {
                                        addMembers ( members , row ) ;
                                    }
                                    ) ;
                                    var __tame_fn_12 = function (__tame_k) {
                                        tame.setActiveCb (__tame_defer_cb);
                                        var mo;
                                        var __tame_fn_13 = function (__tame_k) {
                                            tame.setActiveCb (__tame_defer_cb);
                                            var __tame_defers = new tame.Deferrals (__tame_k);
                                            var __tame_fn_14 = function (__tame_k) {
                                                tame.setActiveCb (__tame_defer_cb);
                                                moquery . on ( 'end' ,
                                                __tame_defers.defer ( { 
                                                    assign_fn : 
                                                        function () {
                                                            mo = arguments[0];
                                                        }
                                                        ,
                                                    parent_cb : __tame_defer_cb,
                                                    line : 314,
                                                    file : "web.tjs"
                                                } )
                                                ) ;
                                                tame.callChain([__tame_k]);
                                                tame.setActiveCb (null);
                                            };
                                            __tame_fn_14(tame.end);
                                            __tame_defers._fulfill();
                                            tame.setActiveCb (null);
                                        };
                                        var __tame_fn_45 = function (__tame_k) {
                                            tame.setActiveCb (__tame_defer_cb);
                                            var xoquery = client . query ( 'select * from team where event_id=$1 and gender=$2 and age in (\'' +openCategories+ '\') order by status=\'finished\' desc, score desc, time asc limit 3' , [ event . id , 'mixed' ] ,
                                            function  () {
                                            }
                                            ) ;
                                            xoquery . on ( 'row' ,
                                            function  (row) {
                                                addMembers ( members , row ) ;
                                            }
                                            ) ;
                                            var __tame_fn_15 = function (__tame_k) {
                                                tame.setActiveCb (__tame_defer_cb);
                                                var xo;
                                                var __tame_fn_16 = function (__tame_k) {
                                                    tame.setActiveCb (__tame_defer_cb);
                                                    var __tame_defers = new tame.Deferrals (__tame_k);
                                                    var __tame_fn_17 = function (__tame_k) {
                                                        tame.setActiveCb (__tame_defer_cb);
                                                        xoquery . on ( 'end' ,
                                                        __tame_defers.defer ( { 
                                                            assign_fn : 
                                                                function () {
                                                                    xo = arguments[0];
                                                                }
                                                                ,
                                                            parent_cb : __tame_defer_cb,
                                                            line : 317,
                                                            file : "web.tjs"
                                                        } )
                                                        ) ;
                                                        tame.callChain([__tame_k]);
                                                        tame.setActiveCb (null);
                                                    };
                                                    __tame_fn_17(tame.end);
                                                    __tame_defers._fulfill();
                                                    tame.setActiveCb (null);
                                                };
                                                var __tame_fn_44 = function (__tame_k) {
                                                    tame.setActiveCb (__tame_defer_cb);
                                                    var woquery = client . query ( 'select * from team where event_id=$1 and gender=$2 and age in (\'' +openCategories+ '\') order by status=\'finished\' desc, score desc, time asc limit 3' , [ event . id , 'women' ] ,
                                                    function  () {
                                                    }
                                                    ) ;
                                                    woquery . on ( 'row' ,
                                                    function  (row) {
                                                        addMembers ( members , row ) ;
                                                    }
                                                    ) ;
                                                    var __tame_fn_18 = function (__tame_k) {
                                                        tame.setActiveCb (__tame_defer_cb);
                                                        var wo;
                                                        var __tame_fn_19 = function (__tame_k) {
                                                            tame.setActiveCb (__tame_defer_cb);
                                                            var __tame_defers = new tame.Deferrals (__tame_k);
                                                            var __tame_fn_20 = function (__tame_k) {
                                                                tame.setActiveCb (__tame_defer_cb);
                                                                woquery . on ( 'end' ,
                                                                __tame_defers.defer ( { 
                                                                    assign_fn : 
                                                                        function () {
                                                                            wo = arguments[0];
                                                                        }
                                                                        ,
                                                                    parent_cb : __tame_defer_cb,
                                                                    line : 320,
                                                                    file : "web.tjs"
                                                                } )
                                                                ) ;
                                                                tame.callChain([__tame_k]);
                                                                tame.setActiveCb (null);
                                                            };
                                                            __tame_fn_20(tame.end);
                                                            __tame_defers._fulfill();
                                                            tame.setActiveCb (null);
                                                        };
                                                        var __tame_fn_43 = function (__tame_k) {
                                                            tame.setActiveCb (__tame_defer_cb);
                                                            var counters = { } ;
                                                            var durations = [ ] ;
                                                            var categories = [ ] ;
                                                            var displayedCategories = { } ;
                                                            
                                                            var defaultDuration = 24 ;
                                                            
                                                            var teamquery = client . query ( 'select * from team where event_id=$1 order by status=\'finished\' desc, score desc, time asc' , [ event . id ] ) ;
                                                            teamquery . on ( 'row' ,
                                                            function  (row) {
                                                                addMembers ( members , row ) ;
                                                            }
                                                            ) ;
                                                            teamquery . on ( 'row' ,
                                                            function  (row, result) {
                                                                var gender = hbs . handlebars . helpers . genderclass ( row . gender ) ;
                                                                var age = hbs . handlebars . helpers . ageclass ( row . age ) ;
                                                                row . category = gender +age ;
                                                                if (durations . indexOf ( row . duration ) < 0) {
                                                                    durations . push ( row . duration ) ;
                                                                } else {
                                                                }
                                                                if (categories . indexOf ( row . category ) < 0) {
                                                                    categories . push ( row . category ) ;
                                                                } else {
                                                                }
                                                                var countToCategories = getCategoryDescendants ( row . gender , row . age ) ;
                                                                 for (var i = 0 ; i < countToCategories . length ; i ++) {
                                                                    var countToCategory = countToCategories [ i ] ;
                                                                    row [ countToCategory ] = increment ( counters , row . duration , countToCategory ) ;
                                                                }
                                                                row [ 'place' ] = increment ( counters , row . duration , 'all' ) ;
                                                                if (req . query . category) {
                                                                    var availableCategories = getCategoryDescendants ( categoriesToObject [ req . query . category ] . gender , categoriesToObject [ req . query . category ] . age , true ) ;
                                                                    var currentCategoryIsActive = ( availableCategories . indexOf ( row . category ) > -1 ) ;
                                                                } else {
                                                                    var currentCategoryIsActive = true ;
                                                                }
                                                                var currentDurationIsDefault = ( ! req . query . duration && defaultDuration === row . duration ) ;
                                                                var currentDurationIsActive = ( parseInt ( req . query . duration ) === row . duration ) ;
                                                                if (( ! req . query . category || currentCategoryIsActive ) && ( currentDurationIsDefault || currentDurationIsActive )) {
                                                                    result . addRow ( row ) ;
                                                                    if (! displayedCategories . hasOwnProperty ( row . category )) {
                                                                        displayedCategories [ row . category ] = 1 ;
                                                                    } else {
                                                                    }
                                                                } else {
                                                                }
                                                            }
                                                            ) ;
                                                            var __tame_fn_21 = function (__tame_k) {
                                                                tame.setActiveCb (__tame_defer_cb);
                                                                var teams;
                                                                var __tame_fn_22 = function (__tame_k) {
                                                                    tame.setActiveCb (__tame_defer_cb);
                                                                    var __tame_defers = new tame.Deferrals (__tame_k);
                                                                    var __tame_fn_23 = function (__tame_k) {
                                                                        tame.setActiveCb (__tame_defer_cb);
                                                                        teamquery . on ( 'end' ,
                                                                        __tame_defers.defer ( { 
                                                                            assign_fn : 
                                                                                function () {
                                                                                    teams = arguments[0];
                                                                                }
                                                                                ,
                                                                            parent_cb : __tame_defer_cb,
                                                                            line : 365,
                                                                            file : "web.tjs"
                                                                        } )
                                                                        ) ;
                                                                        tame.callChain([__tame_k]);
                                                                        tame.setActiveCb (null);
                                                                    };
                                                                    __tame_fn_23(tame.end);
                                                                    __tame_defers._fulfill();
                                                                    tame.setActiveCb (null);
                                                                };
                                                                var __tame_fn_42 = function (__tame_k) {
                                                                    tame.setActiveCb (__tame_defer_cb);
                                                                    done ( ) ;
                                                                    var __tame_fn_24 = function (__tame_k) {
                                                                        tame.setActiveCb (__tame_defer_cb);
                                                                        var __tame_fn_25 = function (__tame_k) {
                                                                            tame.setActiveCb (__tame_defer_cb);
                                                                            var __tame_fn_27 = function (__tame_k) {
                                                                                tame.setActiveCb (__tame_defer_cb);
                                                                                res . status ( 404 ) ;
                                                                                res . render ( 'error/404' , { body : 'Sorry, this event has no results (yet). We are working on it in this very moment.' } ) ;
                                                                                var __tame_fn_26 = function (__tame_k) {
                                                                                    tame.setActiveCb (__tame_defer_cb);
                                                                                        ;
                                                                                        tame.callChain([tame.end, __tame_k]);
                                                                                    tame.setActiveCb (null);
                                                                                };
                                                                                tame.callChain([__tame_fn_26, __tame_k]);
                                                                                tame.setActiveCb (null);
                                                                            };
                                                                            if (teams . rowCount == 0) {
                                                                                tame.callChain([__tame_fn_27, __tame_k]);
                                                                            } else {
                                                                                tame.callChain([__tame_k]);
                                                                            }
                                                                            tame.setActiveCb (null);
                                                                        };
                                                                        var __tame_fn_41 = function (__tame_k) {
                                                                            tame.setActiveCb (__tame_defer_cb);
                                                                            var activeCategory = null ;
                                                                            var activeDuration = null ;
                                                                            var isCategoryInvalid = ( req . query . hasOwnProperty ( 'category' ) && categories . indexOf ( req . query . category ) < 0 ) ;
                                                                            var isDurationInvalid = ( req . query . hasOwnProperty ( 'duration' ) && durations . indexOf ( parseInt ( req . query . duration ) ) < 0 ) ;
                                                                            var isCategoryDefault = ( req . query . hasOwnProperty ( 'category' ) && req . query . category === '' ) ;
                                                                            var isDurationDefault = ( req . query . hasOwnProperty ( 'duration' ) && parseInt ( req . query . duration ) === defaultDuration ) ;
                                                                            
                                                                            var query = { } ;
                                                                            var __tame_fn_28 = function (__tame_k) {
                                                                                tame.setActiveCb (__tame_defer_cb);
                                                                                var __tame_fn_29 = function (__tame_k) {
                                                                                    tame.setActiveCb (__tame_defer_cb);
                                                                                    var __tame_fn_30 = function (__tame_k) {
                                                                                        tame.setActiveCb (__tame_defer_cb);
                                                                                        var __tame_fn_31 = function (__tame_k) {
                                                                                            tame.setActiveCb (__tame_defer_cb);
                                                                                            var __tame_fn_32 = function (__tame_k) {
                                                                                                tame.setActiveCb (__tame_defer_cb);
                                                                                                query . duration = req . query . duration ;
                                                                                                tame.callChain([__tame_k]);
                                                                                                tame.setActiveCb (null);
                                                                                            };
                                                                                            if (! isDurationDefault) {
                                                                                                tame.callChain([__tame_fn_32, __tame_k]);
                                                                                            } else {
                                                                                                tame.callChain([__tame_k]);
                                                                                            }
                                                                                            tame.setActiveCb (null);
                                                                                        };
                                                                                        var __tame_fn_33 = function (__tame_k) {
                                                                                            tame.setActiveCb (__tame_defer_cb);
                                                                                            var __tame_fn_34 = function (__tame_k) {
                                                                                                tame.setActiveCb (__tame_defer_cb);
                                                                                                query . category = req . query . category ;
                                                                                                tame.callChain([__tame_k]);
                                                                                                tame.setActiveCb (null);
                                                                                            };
                                                                                            if (! isCategoryDefault) {
                                                                                                tame.callChain([__tame_fn_34, __tame_k]);
                                                                                            } else {
                                                                                                tame.callChain([__tame_k]);
                                                                                            }
                                                                                            tame.setActiveCb (null);
                                                                                        };
                                                                                        var __tame_fn_36 = function (__tame_k) {
                                                                                            tame.setActiveCb (__tame_defer_cb);
                                                                                            res . redirect ( url . format ( { pathname : req . _parsedUrl . pathname , query : query } ) ) ;
                                                                                            var __tame_fn_35 = function (__tame_k) {
                                                                                                tame.setActiveCb (__tame_defer_cb);
                                                                                                    ;
                                                                                                    tame.callChain([tame.end, __tame_k]);
                                                                                                tame.setActiveCb (null);
                                                                                            };
                                                                                            tame.callChain([__tame_fn_35, __tame_k]);
                                                                                            tame.setActiveCb (null);
                                                                                        };
                                                                                        tame.callChain([__tame_fn_31, __tame_fn_33, __tame_fn_36, __tame_k]);
                                                                                        tame.setActiveCb (null);
                                                                                    };
                                                                                    if (isCategoryDefault || isDurationDefault) {
                                                                                        tame.callChain([__tame_fn_30, __tame_k]);
                                                                                    } else {
                                                                                        tame.callChain([__tame_k]);
                                                                                    }
                                                                                    tame.setActiveCb (null);
                                                                                };
                                                                                var __tame_fn_37 = function (__tame_k) {
                                                                                    tame.setActiveCb (__tame_defer_cb);
                                                                                    var __tame_fn_39 = function (__tame_k) {
                                                                                        tame.setActiveCb (__tame_defer_cb);
                                                                                        res . status ( 404 ) ;
                                                                                        res . render ( 'error/404' ) ;
                                                                                        var __tame_fn_38 = function (__tame_k) {
                                                                                            tame.setActiveCb (__tame_defer_cb);
                                                                                                ;
                                                                                                tame.callChain([tame.end, __tame_k]);
                                                                                            tame.setActiveCb (null);
                                                                                        };
                                                                                        tame.callChain([__tame_fn_38, __tame_k]);
                                                                                        tame.setActiveCb (null);
                                                                                    };
                                                                                    if (isDurationInvalid || isCategoryInvalid) {
                                                                                        tame.callChain([__tame_fn_39, __tame_k]);
                                                                                    } else {
                                                                                        tame.callChain([__tame_k]);
                                                                                    }
                                                                                    tame.setActiveCb (null);
                                                                                };
                                                                                var __tame_fn_40 = function (__tame_k) {
                                                                                    tame.setActiveCb (__tame_defer_cb);
                                                                                    var activeDuration = req . query . hasOwnProperty ( 'duration' ) ? parseInt ( req . query . duration ) : defaultDuration ;
                                                                                    res . render ( 'results' , {
                                                                                    title : 'Results of ' + event . name ,
                                                                                    event : event ,
                                                                                    teams : teams . rows ,
                                                                                    mo : { teams : mo . rows } ,
                                                                                    xo : { teams : xo . rows } ,
                                                                                    wo : { teams : wo . rows } ,
                                                                                    identity : req . user ,
                                                                                    is : displayedCategories ,
                                                                                    activeCategory : req . query . hasOwnProperty ( 'category' ) ? req . query . category : null ,
                                                                                    categories : categories ,
                                                                                    counters : JSON . stringify ( counters ) ,
                                                                                    activeDuration : activeDuration ,
                                                                                    durations : durations . length > 1 ? durations : null
                                                                                    } ) ;
                                                                                    tame.callChain([__tame_k]);
                                                                                    tame.setActiveCb (null);
                                                                                };
                                                                                tame.callChain([__tame_fn_29, __tame_fn_37, __tame_fn_40, __tame_k]);
                                                                                tame.setActiveCb (null);
                                                                            };
                                                                            tame.callChain([__tame_fn_28, __tame_k]);
                                                                            tame.setActiveCb (null);
                                                                        };
                                                                        tame.callChain([__tame_fn_25, __tame_fn_41, __tame_k]);
                                                                        tame.setActiveCb (null);
                                                                    };
                                                                    tame.callChain([__tame_fn_24, __tame_k]);
                                                                    tame.setActiveCb (null);
                                                                };
                                                                tame.callChain([__tame_fn_22, __tame_fn_42, __tame_k]);
                                                                tame.setActiveCb (null);
                                                            };
                                                            tame.callChain([__tame_fn_21, __tame_k]);
                                                            tame.setActiveCb (null);
                                                        };
                                                        tame.callChain([__tame_fn_19, __tame_fn_43, __tame_k]);
                                                        tame.setActiveCb (null);
                                                    };
                                                    tame.callChain([__tame_fn_18, __tame_k]);
                                                    tame.setActiveCb (null);
                                                };
                                                tame.callChain([__tame_fn_16, __tame_fn_44, __tame_k]);
                                                tame.setActiveCb (null);
                                            };
                                            tame.callChain([__tame_fn_15, __tame_k]);
                                            tame.setActiveCb (null);
                                        };
                                        tame.callChain([__tame_fn_13, __tame_fn_45, __tame_k]);
                                        tame.setActiveCb (null);
                                    };
                                    tame.callChain([__tame_fn_12, __tame_k]);
                                    tame.setActiveCb (null);
                                };
                                tame.callChain([__tame_fn_10, __tame_fn_46, __tame_k]);
                                tame.setActiveCb (null);
                            };
                            tame.callChain([__tame_fn_9, __tame_k]);
                            tame.setActiveCb (null);
                        };
                        tame.callChain([__tame_fn_4, __tame_fn_6, __tame_fn_47, __tame_k]);
                        tame.setActiveCb (null);
                    };
                    tame.callChain([__tame_fn_3, __tame_k]);
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
        tame.callChain([__tame_fn_1, __tame_fn_2, __tame_k]);
        tame.setActiveCb (null);
    };
    tame.callChain([__tame_fn_0, __tame_k]);
    tame.setActiveCb (null);
};
__tame_fn_48 (tame.end);