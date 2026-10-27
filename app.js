(function () {
  'use strict';

  angular.module('campusCycle', [])
    .controller('RentalController', function ($http, $timeout) {
      var vm = this;
      vm.stations = ['North Quad', 'Student Union', 'Library West', 'Athletics Center'];
      vm.duration = '1';
      vm.bikes = [];
      vm.bookings = [];
      vm.loading = true;
      vm.loadError = '';
      vm.bookingError = '';
      vm.refresh = function () {
        vm.loading = true;
        $http.get('/api/bikes').then(function (response) {
          vm.bikes = response.data.bikes;
          vm.availableCount = vm.bikes.filter(function (bike) { return bike.available; }).length;
          return $http.get('/api/bookings');
        }).then(function (response) {
          vm.bookings = response.data.bookings;
          vm.loadError = '';
        }).catch(function () {
          vm.loadError = 'The rental service could not be reached. Check that the website server is running, then try again.';
        }).finally(function () { vm.loading = false; });
      };
      vm.refresh();
      vm.filteredBikes = function () {
        var search = (vm.search || '').toLowerCase().trim();
        return vm.bikes.filter(function (bike, index) {
          if (!vm.showAll && index > 3 && !search && !vm.station && !vm.showAvailableOnly) return false;
          if (vm.showAvailableOnly && !bike.available) return false;
          if (vm.station && bike.station !== vm.station) return false;
          return !search || [bike.name, bike.id, bike.station, bike.type].join(' ').toLowerCase().indexOf(search) !== -1;
        });
      };
      vm.resetFilters = function () { vm.search = ''; vm.station = ''; vm.showAvailableOnly = false; };
      vm.openBooking = function (bike) { vm.selectedBike = bike; vm.startTime = '09:00'; };
      vm.closeBooking = function () { vm.selectedBike = null; };
      vm.confirmBooking = function () {
        if (!vm.selectedBike) return;
        var bike = vm.selectedBike;
        vm.savingBooking = true;
        vm.bookingError = '';
        $http.post('/api/bookings', { bikeId: bike.id, duration: vm.duration, startTime: vm.startTime }).then(function (response) {
          vm.confirmation = 'Reservation ' + response.data.booking.code + ' · ' + bike.name;
          vm.closeBooking();
          vm.showRentals = true;
          vm.refresh();
          $timeout(function () { vm.confirmation = ''; }, 5500);
        }).catch(function (response) {
          vm.bookingError = response.data && response.data.error ? response.data.error : 'Could not save your rental. Please try again.';
        }).finally(function () { vm.savingBooking = false; });
      };
      vm.cancelBooking = function (booking) {
        $http.post('/api/bookings/' + encodeURIComponent(booking.id) + '/cancel').then(function () {
          vm.confirmation = 'Rental ' + booking.code + ' cancelled';
          vm.refresh();
          $timeout(function () { vm.confirmation = ''; }, 5500);
        }).catch(function (response) {
          vm.bookingError = response.data && response.data.error ? response.data.error : 'Could not cancel this rental.';
        });
      };
    });
}());
