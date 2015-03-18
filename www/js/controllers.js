angular.module('app.controllers', ['app.services', 'ngStorage', 'firebase'])

.controller('AppCtrl', function($scope, $state, $ionicModal, $ionicHistory, $ionicLoading, $firebase, Utils, Ref, Auth) {
    $scope.loginData = {};
    var modeEnum = {
        LOGIN: {
            buttonText: "Login",
            title: "Login",
            submit: login,
            buttonDisabled: function() {
                return !$scope.loginData.email || !$scope.loginData.password;
            }
        },
        SIGN_UP: {
            buttonText: "Sign Up",
            title: "Sign Up",
            submit: signup,
            buttonDisabled: function() {
                return !$scope.loginData.email || !$scope.loginData.password || !$scope.loginData.displayName;
            }
        },
        FORGET_PASSWORD: {
            buttonText: "Send Reset Email",
            title: "Reset Password",
            submit: forgetPassword,
            buttonDisabled: function() {
                return !$scope.loginData.email;
            }
        }
    };

    var loginModal;
    $scope.modeEnum = modeEnum;
    $scope.mode = modeEnum.LOGIN;

    Auth.$onAuth(function(authData) {
        if (authData) {
            $ionicHistory.clearCache();
            $ionicHistory.nextViewOptions({
                disableAnimate: true,
                disableBack: true,
                historyRoot: true
            });
            $state.go("app.wishlist");

            /* Prepare side menue */
            $scope.uid = authData.uid;
            var list = $firebase(Ref.beSharedList(authData.uid)).$asArray();
            list.$watch(function(event) {
                if (event.event == 'child_added') {
                    var rec = list.$getRecord(event.key);
                    $firebase(Ref.displayName(rec.$value)).$asObject().$loaded().then(function(dName) {
                        rec.uid = rec.$value;
                        rec.displayName = dName.$value;
                    });
                }
            });
            $scope.beSharedList = list;
        } else {
            if (loginModal) {
                loginModal.show();
            } else {
                $ionicModal.fromTemplateUrl('templates/login.html', {
                    scope: $scope,
                    hardwareBackButtonClose: false
                }).then(function(modal) {
                    loginModal = modal;
                    loginModal.show();
                });
            }
        }
    });

    function login() {
        $ionicLoading.show({
            template: 'Logging in'
        });

        Auth.$authWithPassword($scope.loginData).then(function(authData) {
            $scope.closeLogin();
        }).catch(function(error) {
            Utils.toastLong(error.message);
        }).finally(function() {
            $ionicLoading.hide();
        });
    }

    function signup() {
        Auth.$createUser($scope.loginData).then(function(userData) {
            console.log("User " + userData.uid + " created successfully!");
            $firebase(Ref.emailUidMap().child(Utils.emailToKey($scope.loginData.email))).$set(userData.uid);
            $firebase(Ref.displayName(userData.uid)).$set($scope.loginData.displayName);
            login();
        }).catch(function(error) {
            Utils.toastLong(error.message);
        });
    }

    function forgetPassword() {
        Auth.$resetPassword($scope.loginData).then(function() {
            Utils.toastLong("Password reset email sent successfully!");
        }).catch(function(error) {
            Utils.toastLong(error.message);
        });
    }

    $scope.closeLogin = function() {
        loginModal.hide().then(function() {
            $scope.mode = modeEnum.LOGIN;
        });
    };

    $scope.setMode = function(mode) {
        $scope.mode = mode;
    };
})

.controller('WishlistCtrl', function($scope, $state, $stateParams, $ionicPopup, $ionicLoading, $firebase, authData, displayName, Utils, Ref) {
    var modeEnum = {
        MY_WISHLIST: {
            emptyMessage: "Currently you don't have any wish.",
            title: "My Wishlist",
            showAdd: true,
            editable: true,
            delWarning: "Your wish will be removed from your wishlist.",
            leftBtnText: "Purchased",
            leftBtnOnClick: function(index) {
                $ionicPopup.alert({
                    title: '<b>Your Wish Comes Ture!</b>',
                    template: 'Your purchased item will be moved to purchased list.'
                }).then(function(res) {
                    $scope.wishlist[index].purchased = true;
                    $scope.wishlist.$save(index);
                });
            },
        },
        PURCHASED_LIST: {
            emptyMessage: "You haven't purchased anything.",
            title: "Purchased List",
            showAdd: false,
            editable: true,
            delWarning: "The item will be removed from your purchased list.",
            leftBtnText: "Want it again",
            leftBtnOnClick: function(index, purchased) {
                $ionicPopup.alert({
                    title: '<b>Want it again?</b>',
                    template: 'The item will be moved to wishlist again.'
                }).then(function(res) {
                    $scope.wishlist[index].purchased = false;
                    $scope.wishlist.$save(index);
                });
            },
        },
        SHARED_WISHLIST: {
            emptyMessage: "Currently s/he doesn't have any wish.",
            title: displayName.$value + "'s Wishlist",
            showAdd: false,
            editable: false
        }
    };

    var mode;
    var uid = $stateParams.uid || authData.uid;
    if (uid == authData.uid) {
        if ($stateParams.purchased == "true") {
            mode = modeEnum.PURCHASED_LIST;
        } else {
            mode = modeEnum.MY_WISHLIST;
        }
    } else {
        mode = modeEnum.SHARED_WISHLIST;
    }

    $ionicLoading.show({
        template: 'Loading...'
    });

    $scope.mode = mode;
    $scope.uid = uid;
    $firebase(Ref.wishlist(uid).orderByChild("purchased").equalTo(mode == modeEnum.PURCHASED_LIST)).$asArray().$loaded().then(function(list) {
        $scope.wishlist = list;

        var pictures = {};
        list.forEach(function(entry) {
            var wishId = entry.$id;
            var firstPic = $firebase(Ref.wishPictures(uid, wishId).limitToFirst(1)).$asArray();
            var loadFirstPic = function(wishId) {
                firstPic.$loaded().then(function(picList) {
                    if (picList.length > 0) {
                        pictures[wishId] = picList[0].$value;
                    } else {
                        delete pictures[wishId];
                    }
                });
            };

            firstPic.$watch(function(event) {
                loadFirstPic(wishId);
            });
        });

        $scope.pictures = pictures;
    }).finally(function() {
        $ionicLoading.hide();
    });

    $scope.removeWish = function(wishId) {
        $ionicPopup.confirm({
            title: 'Delete?',
            template: mode.delWarning
        }).then(function(res) {
            if (res) {
                var wishlist = $scope.wishlist;
                wishlist.$remove(wishlist.$indexFor(wishId));
                $firebase(Ref.wishPictures(uid, wishId)).$asObject().$remove();
            }
        });
    };

    $scope.clickUrl = function(url) {
        window.open(url, '_system');
    };

    $scope.addWish = function() {
        $state.go('app.wish', {
            uid: authData.uid
        });
    };
})

.controller('WishCtrl', function(wish, $scope, $stateParams, $timeout, $ionicHistory, $ionicLoading, $firebase, authData, Utils, Ref, Camera) {
    var modeEnum = {
        EDIT: {
            title: "Edit",
            save: function() {
                $scope.wish.hasPicture = false;
                pics.forEach(function(p) {
                    if ('$id' in p) { /* existing picture */
                        if (p.deleted) {
                            savedPics.$remove(savedPics.$indexFor(p.$id));
                        } else {
                            $scope.wish.hasPicture = true;
                        }
                    } else { /* new picture */
                        if (!p.deleted) {
                            savedPics.$add(p);
                            $scope.wish.hasPicture = true;
                        }
                    }
                });
                $scope.wish.$save().finally(function() {
                    $ionicLoading.hide();
                });
            }
        },
        CREATE: {
            title: "Create a Wish",
            save: function() {
                $scope.wish.hasPicture = false;
                var wishlist = $firebase(Ref.wishlist(uid)).$asArray();
                wishlist.$add($scope.wish).then(function(wish) {
                    pics.forEach(function(p) {
                        if (!p.deleted) {
                            $firebase(Ref.wishPictures(uid, wish.key())).$asArray().$add(p);
                            wish.update({
                                hasPicture: true
                            });
                        }
                    });

                }).finally(function() {
                    $ionicLoading.hide();
                });
            }
        }
    };


    var uid = $stateParams.uid;
    var mode = $stateParams.wishId ? modeEnum.EDIT : modeEnum.CREATE;

    $scope.mode = mode;
    $scope.pics = [];
    $scope.wish = wish || {
        purchased: false
    };

    var pics = $scope.pics;
    var savedPics = null;

    if (mode === modeEnum.EDIT) { /* if edit mode, read existing data. */
        $timeout(function() {
            /* Downloading pictures takes a while, so delay to avoid interfering UI. */
            $ionicLoading.show({
                template: 'Loading...'
            });

            savedPics = $firebase(Ref.wishPictures(uid, $stateParams.wishId)).$asArray();
            savedPics.$loaded().then(function() {
                for (var i = 0; i < savedPics.length; ++i) {
                    pics.push(savedPics[i]);
                }
            }).catch(function(error) {
                Utils.toastLong(error.message);
            }).finally(function() {
                $ionicLoading.hide();
            });
        }, 400);
    }

    $scope.saveWish = function() {
        $ionicLoading.show({
            template: 'Saving...'
        });

        var url = $scope.wish.url;
        if (url) {
            if (!Utils.validateUrl(url)) {
                $scope.wish.url = 'http://' + url;
            }
        }

        $scope.wish.time = new Date().getTime();

        mode.save();
        $ionicHistory.goBack();
    };

    $scope.insertPic = function(camera) {
        Camera.getPicture(camera).then(function(imageURI) {
            pics.push({
                $value: 'data:image/jpeg;base64,' + imageURI
            });
        }, function(err) {
            Utils.toastLong(err);
        });
    };

    $scope.delPic = function(index) {
        pics[index].deleted = true;
    };
})

.controller('ShareCtrl', function($scope, $ionicPopup, $firebase, authData, Utils, Ref) {
    $scope.inputData = {};
    var invitationContent = 'Hi,\n\n' +
        'I\'m using ShareWish, a mobile app allowing us share our wishes. ' +
        'I want to share mine with you and you could download the app from Google Play.' +
        '\n\nBest';

    var shareList = $firebase(Ref.shareList(authData.uid)).$asArray();
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
            var uidObj = $firebase(Ref.emailUidMap().child(emailKey)).$asObject();
            uidObj.$loaded().then(function() {
                var uid = uidObj.$value;
                if (uid) { /* Successful */
                    $scope.shareList.$add($scope.inputData);

                    var list = $firebase(Ref.beSharedList(uid)).$asArray();
                    list.$add(authData.uid);

                    /* clear */
                    $scope.inputData = {};
                } else { /* Not a registered user */
                    console.log(email + ' is not a registered user.');
                    $ionicPopup.confirm({
                        title: 'Invite ' + email + '?',
                        template: email + ' is not a registered user. Do you want to invite him/her to use ShareWish?'
                    }).then(function(res) {
                        if (res) {
                            /* send invitation */
                            if (window.plugins && window.plugins.emailComposer) {
                                window.plugins.emailComposer.showEmailComposerWithCallback(function(result) {
                                        console.log("Response -> " + result);
                                    },
                                    "Invitation of ShareWish", // Subject
                                    invitationContent, // Body
                                    [email], // To
                                    null, // CC
                                    null, // BCC
                                    false, // isHTML
                                    null, // Attachments
                                    null); // Attachment Data
                            } else {
                                Utils.toastLong("Your device doesn't support sending email.");
                            }
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
        $firebase(Ref.emailUidMap().child(emailKey)).$asObject().$loaded().then(function(uidObj) {
            var uid = uidObj.$value;
            if (uid) {
                $firebase(Ref.beSharedList(uid)).$asArray().$loaded().then(function(list) {
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
})

.controller('AccountCtrl', function($scope, $state, $ionicPopup, $firebase, authData, Utils, Ref, Auth) {
    $scope.title = authData.password.email;
    $scope.profile = {};
    $scope.pwd = {};
    $scope.pwd.email = authData.password.email;
    $scope.displayName = [];

    $firebase(Ref.profile(authData.uid)).$asObject().$loaded().then(function(obj) {
        var profile = {};
        $scope.profile.name = obj.name || '';
        $scope.profile.gender = obj.gender || 'Male';
        $scope.profile.birthday = new Date(obj.birthday || 631170000000); /* 1/1/1990 is default */
    });

    $firebase(Ref.displayName(authData.uid)).$asObject().$loaded().then(function(obj) {
        $scope.displayName[0] = obj.$value;
    });

    $scope.saveProfile = function() {
        var profile = JSON.parse(JSON.stringify($scope.profile)); /* copy object */
        profile.birthday = $scope.profile.birthday.getTime();
        $firebase(Ref.profile(authData.uid)).$set(profile).then(function() {
            Utils.toastLong('Profile saved');
        });
    };

    $scope.changePassword = function() {
        if ($scope.pwd.newPassword != $scope.pwd.confirmPassword) {
            Utils.toastLong("Password should be consistent.");
        } else {
            Auth.$changePassword($scope.pwd).then(function() {
                Utils.toastLong("Password changed successfully!");
                Auth.$unauth();
            }).catch(function(error) {
                Utils.toastLong(error.message);
            });
        }
    };

    $scope.logout = function() {
        $ionicPopup.confirm({
            title: 'Logout?',
            template: 'Are you going to logout?'
        }).then(function(res) {
            if (res) {
                Auth.$unauth();
                $state.reload();
            }
        });
    };

    $scope.updateDisplayName = function() {
        console.log($scope.displayName[0]);
        Ref.displayName(authData.uid).set($scope.displayName[0], function(error) {
            if (error) {
                Utils.toastLong(error.message);
            } else {
                Utils.toastLong("Display name updated");
            }
        });
    };
});
