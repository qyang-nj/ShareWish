angular.module('starter.controllers', ['ngStorage', 'firebase'])

.controller('AppCtrl', function($scope, $ionicModal, $firebase, $firebaseAuth) {
    /* Firebase keys cannot have a period (.) in them, so this converts the emails to valid keys */
    function emailToKey(emailAddress) {
        return emailAddress.replace('.', ',');
    }

    var ref = new Firebase("https://lovers-wish.firebaseio.com/");
    var auth = $firebaseAuth(ref);
    auth.$onAuth(function(authData) {
        if (!authData) {
            delete $scope.authData;
            return;
        }

        console.log("[AppCtrl] Authenticated user with uid:", authData.uid);
        $scope.authData = authData;
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
                $firebase(ref.child('users/' + userData.uid + '/share/wishlist/')).$set(userData.uid);
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

.controller('WishlistCtrl', function($scope, $state, $firebase, $firebaseAuth) {
    var ref = new Firebase("https://lovers-wish.firebaseio.com/");
    $firebaseAuth(ref).$onAuth(function(authData) {
        if (!authData) {
            delete $scope.wishlist;
            return;
        }

        console.log("[WishlistCtrl] Authenticated user with uid:", authData.uid);

        var wishlist = $firebase(ref.child('users/' + authData.uid + '/share/wishlist/')).$asArray();
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

.controller('WishCtrl', function($scope, $ionicHistory, $firebase, $firebaseAuth) {
    $scope.wish = {};

    var ref = new Firebase("https://lovers-wish.firebaseio.com/");
    $firebaseAuth(ref).$onAuth(function(authData) {
        if (!authData) return;

        console.log("[WishCtrl] Authenticated user with uid:", authData.uid);

        $scope.saveWish = function() {
            var wishlist = $firebase(ref.child('users/' + authData.uid + '/share/wishlist/')).$asArray();
            wishlist.$add($scope.wish);
            $ionicHistory.backView().go();
        };
    });
});
