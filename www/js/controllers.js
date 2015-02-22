angular.module('starter.controllers', ['app.services', 'ngStorage', 'firebase'])

.controller('AppCtrl', function($scope, $state, $ionicModal, $firebase, $firebaseAuth, Utils) {
    var auth = $firebaseAuth(Utils.refRoot());

    /* Create the login modal that we will use later */
    $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: $scope,
        hardwareBackButtonClose: false
    }).then(function(modal) {
        $scope.modal = modal;

        auth.$onAuth(function(authData) {
            if (!authData) {
                delete $scope.authData;
                $scope.login();
                return;
            }

            console.log("[AppCtrl] Authenticated user with uid:", authData.uid);
            $scope.authData = authData;

            var list = $firebase(Utils.refBeSharedList(authData.uid)).$asArray();
            list.$watch(function(event) {
                if (event.event == 'child_added') {
                    var rec = list.$getRecord(event.key);
                    $firebase(Utils.refDisplayName(rec.$value)).$asObject().$loaded().then(function(dName) {
                        rec.uid = rec.$value;
                        rec.displayName = dName.$value;
                    });
                }
            });
            $scope.beSharedList = list;
        });
    });

    // Form data for the login modal
    $scope.loginData = {};
    $scope.loginMode = true;

    $scope.login = function() {
        $scope.modal.show();
    };

    // Triggered in the login modal to close it
    $scope.closeLogin = function() {
        $scope.modal.hide();
        $scope.loginMode = true;
    };

    $scope.setLoginMode = function(loginMode) {
        $scope.loginMode = loginMode;
    };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function() {
        if ($scope.loginMode) { /* Login */
            auth.$authWithPassword($scope.loginData).then(function(authData) {
                console.log("Authenticated successfully with payload:", authData);
                $scope.closeLogin();
            }).catch(function(error) {
                Utils.toastLong(error.message);
            });
        } else { //sign up
            auth.$createUser($scope.loginData).then(function(userData) {
                console.log("User " + userData.uid + " created successfully!");
                $firebase(Utils.refEmailUidMap().child(Utils.emailToKey($scope.loginData.email))).$set(userData.uid);
                $firebase(Utils.refDisplayName(userData.uid)).$set($scope.loginData.displayName);

                $scope.loginMode = true;
                $scope.doLogin();
            }).catch(function(error) {
                Utils.toastLong(error.message);
            });
        }
    };
})

.controller('WishlistCtrl', function($scope, $state, $stateParams, $firebase, $firebaseAuth, Utils) {
    $firebaseAuth(Utils.refRoot()).$onAuth(function(authData) {
        if (!authData) {
            delete $scope.wishlist;
            return;
        }

        console.log("[WishlistCtrl] Authenticated user with uid:", authData.uid);

        $scope.editable = $stateParams.uid ? false : true;
        var uid = $stateParams.uid || authData.uid;

        var wishlist = $firebase(Utils.refWishlist(uid)).$asArray();
        $scope.wishlist = wishlist;

        $scope.removeWish = function(wishId) {
            var wishlist = $scope.wishlist;
            wishlist.$remove(wishlist.$indexFor(wishId));
            $firebase(Utils.refWishPictures(uid, wishId)).$asObject().$remove();
        };

        $scope.clickUrl = function(url) {
            window.open(url, '_system');
        };
    });

    $scope.addWish = function() {
        $state.go('app.wish');
    };
})

.controller('WishCtrl', function($scope, $stateParams, $timeout, $ionicHistory, $firebase, $firebaseAuth, Utils, Camera) {
    $firebaseAuth(Utils.refRoot()).$onAuth(function(authData) {
        if (!authData) return;

        var uid = authData.uid;
        var editMode = $stateParams.wishId ? true : false;

        console.log("[WishCtrl] uid:", uid, " editMode:", editMode);

        $scope.wish = {};
        $scope.newPics = [];

        if (editMode) {
            $scope.wish = $firebase(Utils.refWishlist(uid).child($stateParams.wishId)).$asObject();
            $timeout(function() {
                /* Downloading pictures takes a while, so delay to avoid interfering UI. */
                $scope.pictures = $firebase(Utils.refWishPictures(uid, $stateParams.wishId)).$asArray();
            }, 200);
        }

        $scope.saveWish = function() {
            var url = $scope.wish.url;
            if (url) {
                if (!Utils.validateUrl(url)) {
                    $scope.wish.url = 'http://' + url;
                }
            }

            $scope.wish.hasPicture = ($scope.newPics.length > 0 || ($scope.pictures !== null && $scope.pictures.length > 0));

            if (editMode) {
                $scope.wish.$save();
                $scope.newPics.forEach(function(entry) {
                    $scope.pictures.$add(entry);
                });
            } else { /* createMode */
                var wishlist = $firebase(Utils.refWishlist(uid)).$asArray();
                wishlist.$add($scope.wish).then(function(ref) {
                    $scope.newPics.forEach(function(entry) {
                        $firebase(Utils.refWishPictures(uid, ref.key())).$asArray().$add(entry);
                    });
                });
            }

            $ionicHistory.goBack();
        };

        $scope.insertPic = function() {
            Camera.getPicture().then(function(imageURI) {
                console.log(imageURI);
            }, function(err) {
                console.err(err);
            });
        };

        $scope.uploadFile = function() {
            console.log('clicked');
            var file = $scope.wish.imageFile;

            var reader = new FileReader();
            reader.onload = function(readerEvt) {
                var binaryString = readerEvt.target.result;
                //console.log(btoa(binaryString));
                $scope.newPics.push('data:image/png;base64,' + btoa(binaryString));
                delete $scope.wish.imageFile;
            };

            reader.readAsBinaryString(file);
        };
    });
})

.controller('ShareCtrl', function($scope, $ionicPopup, $firebase, $firebaseAuth, Utils) {
    $scope.inputData = {};

    $firebaseAuth(Utils.refRoot()).$onAuth(function(authData) {
        if (!authData) return;

        console.log("[ShareCtrl] Authenticated user with uid:", authData.uid);

        var shareList = $firebase(Utils.refShareList(authData.uid)).$asArray();
        $scope.shareList = shareList;

        $scope.add = function() {
            var email = $scope.inputData.email;
            if (email == authData.password.email) { /* user-self */
                Utils.toastLong('Please enter email address other than yours.');
                return;
            }

            for (var i = 0; i < shareList.length; ++i) {
                if (shareList[i].email == email) { /* duplicate */
                    Utils.toastLong(email + ' already in your share list.');
                    return;
                }
            }

            if (Utils.validateEmail(email)) {
                var emailKey = Utils.emailToKey(email);
                var uidObj = $firebase(Utils.refEmailUidMap().child(emailKey)).$asObject();
                uidObj.$loaded().then(function() {
                    var uid = uidObj.$value;
                    if (uid) { /* Successful */
                        $scope.shareList.$add($scope.inputData);

                        var list = $firebase(Utils.refBeSharedList(uid)).$asArray();
                        list.$add(authData.uid);

                        /* clear */
                        $scope.inputData = {};
                    } else { /* Not a registered user */
                        console.log(email + ' is not a registered user.');
                        $ionicPopup.confirm({
                            title: 'Invite ' + email + '?',
                            template: email + ' is not a registered user. Do you want to invite him/her to use Lover\'s Wish?'
                        }).then(function(res) {
                            if (res) {
                                //TODO: send invitation
                            }
                        });
                    }

                }).catch(function(error) {
                    console.error("Error:", error);
                });
            } else { /* invalid email address */
                Utils.toastLong('Please input a valid email address.');
            }
        };

        $scope.del = function(shareId, shareEmail) {
            var shareList = $scope.shareList;
            shareList.$remove(shareList.$indexFor(shareId));

            var emailKey = Utils.emailToKey(shareEmail);
            $firebase(Utils.refEmailUidMap().child(emailKey)).$asObject().$loaded().then(function(uidObj) {
                var uid = uidObj.$value;
                if (uid) {
                    $firebase(Utils.refBeSharedList(uid)).$asArray().$loaded().then(function(list) {
                        for (var i = 0; i < list.length; ++i) {
                            if (list[i].$value == authData.uid) {
                                list.$remove(i);
                                break;
                            }
                        }
                    });
                }
            });
        };
    });
})

.controller('AccountCtrl', function($scope, $ionicHistory, $ionicPopup, $firebase, $firebaseAuth, Utils) {
    $scope.profile = {};

    var auth = $firebaseAuth(Utils.refRoot());
    auth.$onAuth(function(authData) {
        if (!authData) return;

        $scope.profile.email = authData.password.email;
        $firebase(Utils.refProfile(authData.uid)).$asObject().$loaded().then(function(obj) {
            var profile = {};
            $scope.profile.name = obj.name || '';
            $scope.profile.gender = obj.gender || 'Male';
            $scope.profile.birthday = new Date(obj.birthday || 631170000000); /* 1/1/1990 is default */
        });

        $scope.saveProfile = function() {
            var profile = JSON.parse(JSON.stringify($scope.profile)); /* copy object */
            profile.birthday = $scope.profile.birthday.getTime();
            $firebase(Utils.refProfile(authData.uid)).$set(profile);
        };

        $scope.logout = function() {
            $ionicPopup.confirm({
                title: 'Logout?',
                template: 'Are you going to logout?'
            }).then(function(res) {
                if (res) {
                    auth.$unauth();
                    $ionicHistory.goBack();
                }
            });
        };
    });
})

.directive('fileModel', ['$parse', function($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function() {
                scope.$apply(function() {
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);
