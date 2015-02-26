angular.module('starter', ['starter.controllers', 'app.services', 'ionic', 'firebase'])

.run(function($ionicPlatform) {
    console.log('Platform: ', ionic.Platform.platform());

    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }
    });
})

.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('app', {
            url: "/app",
            templateUrl: "templates/menu.html",
            controller: 'AppCtrl'
        })
        .state('app.wishlist', {
            url: "/wishlist/:uid?purchased",
            views: {
                'content': {
                    templateUrl: "templates/wishlist.html",
                    controller: 'WishlistCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }],
                        displayName: function(Ref, $stateParams, $firebase) {
                            return $firebase(Ref.displayName($stateParams.uid)).$asObject().$loaded();
                        }
                    }
                }
            }
        })
        .state('app.wish', {
            url: "/wish/:uid?wishId",
            views: {
                'content': {
                    templateUrl: "templates/wish.html",
                    controller: 'WishCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }],
                        wish: function(Ref, $stateParams, $firebase) {
                            if ($stateParams.wishId) {
                                return $firebase(Ref.wishlist($stateParams.uid).child($stateParams.wishId))
                                    .$asObject().$loaded();
                            }
                        }
                    }
                }
            }
        })
        .state('app.share', {
            url: "/share",
            views: {
                'content': {
                    templateUrl: "templates/share.html",
                    controller: 'ShareCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }]
                    }
                }
            }
        })
        .state('app.account', {
            url: "/account",
            views: {
                'content': {
                    templateUrl: "templates/account.html",
                    controller: 'AccountCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }]
                    }
                }
            }
        })
        .state('app.pictures', {
            url: "/picture/:uid/:wishId",
            views: {
                'content': {
                    templateUrl: "templates/picture.html",
                    controller: 'WishCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }],
                        wish: function(Ref, $stateParams, $firebase) {
                            return $firebase(Ref.wishlist($stateParams.uid).child($stateParams.wishId)).$asObject().$loaded();
                        }
                    }
                }
            }
        });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app');
});
