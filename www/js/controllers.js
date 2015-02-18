angular.module('starter.controllers', ['ngStorage', 'ngCordova', 'firebase'])

.controller('AppCtrl', function($scope, $ionicModal, $firebase, $firebaseAuth) {
    /* Firebase keys cannot have a period (.) in them, so this converts the emails to valid keys */
    function emailToKey(emailAddress) {
        return emailAddress.replace('.', ',');
    }
    $scope.emailToKey = emailToKey;

    var ref = new Firebase("https://lovers-wish.firebaseio.com/");
    var auth = $firebaseAuth(ref);
    auth.$onAuth(function(authData) {
        if (!authData) {
            delete $scope.authData;
            return;
        }

        console.log("[AppCtrl] Authenticated user with uid:", authData.uid);
        $scope.authData = authData;

        var list = $firebase(ref.child('users/' + authData.uid + '/public/besharedList')).$asArray();
        list.$watch(function(event) {
            if (event.event == 'child_added') {
                var rec = list.$getRecord(event.key);
                $firebase(ref.child('users/' + rec.$value + '/share/displayName/')).$asObject().$loaded().then(function(dName) {
                    rec.uid = rec.$value;
                    rec.displayName = dName.$value;
                });
                console.log(rec);
            }

        });
        $scope.beSharedList = list;
    });

    // Form data for the login modal
    $scope.loginData = {};
    $scope.loginMode = true;

    // Create the login modal that we will use later
    $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: $scope
    }).then(function(modal) {
        $scope.modal = modal;
    });

    // Open the login modal
    $scope.login = function() {
        $scope.modal.show();
    };

    $scope.logout = function() {
        auth.$unauth();
    }

    // Triggered in the login modal to close it
    $scope.closeLogin = function() {
        $scope.modal.hide();
        $scope.loginMode = true;
        delete $scope.errMsg;
    };

    $scope.signupMode = function() {
        $scope.loginMode = false;
    };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function() {
        console.log('Doing login', $scope.loginMode, $scope.loginData);

        if ($scope.loginMode) { /* Login */
            auth.$authWithPassword($scope.loginData).then(function(authData) {
                console.log("Authenticated successfully with payload:", authData);
                $scope.closeLogin();
            }).catch(function(error) {
                $scope.errMsg = "Login Failed! " + error;
                console.log("Login Failed!", error);
            });
        } else { //sign up
            auth.$createUser($scope.loginData).then(function(userData) {
                console.log("User " + userData.uid + " created successfully!");
                $firebase(ref.child('sys/emailUidMap/' + $scope.emailToKey($scope.loginData.email))).$set({
                    'uid': userData.uid
                });
                $firebase(ref.child('users/' + userData.uid + '/share/displayName/')).$set($scope.loginData.displayName);

                $scope.loginMode = true;
                $scope.doLogin();
            }).catch(function(error) {
                switch (error.code) {
                    case "EMAIL_TAKEN":
                        $scope.errMsg = "The new user account cannot be created because the email is already in use.";
                        break;
                    case "INVALID_EMAIL":
                        $scope.errMsg = "The specified email is not a valid email.";
                        break;
                    default:
                        $scope.errMsg = "Error creating user:" + error;
                }
                console.log('error: ', error);
            });
        }
    }
})

.controller('WishlistCtrl', function($scope, $state, $stateParams, $firebase, $firebaseAuth) {
    var ref = new Firebase("https://lovers-wish.firebaseio.com/");
    $firebaseAuth(ref).$onAuth(function(authData) {
        if (!authData) {
            delete $scope.wishlist;
            return;
        }

        console.log("[WishlistCtrl] Authenticated user with uid:", authData.uid);

        $scope.editable = $stateParams.uid ? false : true;
        var uid = $stateParams.uid || authData.uid;

        var wishlist = $firebase(ref.child('users/' + uid + '/share/wishlist/')).$asArray();
        $scope.wishlist = wishlist;

        $scope.removeWish = function(wishId) {
            var wishlist = $scope.wishlist;
            wishlist.$remove(wishlist.$indexFor(wishId));
        };
    });

    $scope.addWish = function() {
        $state.go('app.wish');
    };
})

.controller('WishCtrl', function($scope, $ionicHistory, $stateParams, $firebase, $firebaseAuth) {
    $scope.wish = {};

    var ref = new Firebase("https://lovers-wish.firebaseio.com/");
    $firebaseAuth(ref).$onAuth(function(authData) {
        if (!authData) return;

        var editMode = $stateParams.wishId ? true : false;

        if (editMode) {
            $scope.wish = $firebase(ref.child('users/' + authData.uid + '/share/wishlist/' + $stateParams.wishId))
                .$asObject();
        }

        console.log("[WishCtrl] Authenticated user with uid:", authData.uid);

        $scope.saveWish = function() {
            if (editMode) {
                $scope.wish.$save();
            } else { /* createMode */
                var wishlist = $firebase(ref.child('users/' + authData.uid + '/share/wishlist/')).$asArray();
                wishlist.$add($scope.wish);
            }
            $ionicHistory.backView().go();
        };
    });
})

.controller('ShareCtrl', function($scope, $cordovaToast, $firebase, $firebaseAuth, $cordovaToast) {
    $scope.inputData = {};

    function validateEmail(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    var ref = new Firebase("https://lovers-wish.firebaseio.com/");
    $firebaseAuth(ref).$onAuth(function(authData) {
        if (!authData) return;

        console.log("[ShareCtrl] Authenticated user with uid:", authData.uid);

        var shareList = $firebase(ref.child('users/' + authData.uid + '/private/shareList/')).$asArray();
        $scope.shareList = shareList;

        $scope.add = function() {
            var email = $scope.inputData.email;
            if (email == authData.password.email) { /* user-self */
                console.log('Please enter email address other than yours.');
                return;
            }

            for (var i = 0; i < shareList.length; ++i) {
                if (shareList[i].email == email) { /* duplicate */
                    console.log(email + ' already in your share list.');
                    return;
                }
            }

            if (validateEmail(email)) {
                var emailKey = $scope.emailToKey(email);
                var uidObj = $firebase(ref.child('sys/emailUidMap/' + emailKey)).$asObject();
                uidObj.$loaded().then(function() {
                    var uid = uidObj.$value;
                    if (uid) { /* Successful */
                        $scope.shareList.$add($scope.inputData);

                        var list = $firebase(ref.child('users/' + uid + '/public/besharedList')).$asArray();
                        list.$add(authData.uid);

                        /* clear */
                        $scope.inputData = {};
                    } else { /* Not a registered user */
                        console.log(email + ' is not a registered user.');
                    }

                }).catch(function(error) {
                    console.error("Error:", error);
                });
            } else { /* invalid email address */
                console.log('Please input a valid email address.');
            }
        }

        $scope.del = function(shareId, shareEmail) {
            var shareList = $scope.shareList;
            shareList.$remove(shareList.$indexFor(shareId));

            var emailKey = $scope.emailToKey(shareEmail);
            $firebase(ref.child('sys/emailUidMap/' + emailKey)).$asObject().$loaded().then(function(uidObj) {
                var uid = uidObj.$value;
                if (uid) {
                    $firebase(ref.child('users/' + uid + '/public/besharedList')).$asArray().$loaded().then(function(list) {
                        for (var i = 0; i < list.length; ++i) {
                            if (list[i].$value == uid) {
                                list.$remove(i);
                                break;
                            }
                        }
                    });
                }
            });
        };
    });
});
