'use strict';

let map, mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    // this.date = ...;
    // this.id = ...;
    this.coords = coords; // [lat, lng]
    this.distance = distance; //km
    this.duration = duration; // min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[new Date().getMonth()]
    } ${new Date().getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  //min / km
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  //km / h
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([10, 106], 5, 120, 178);
// const cycling1 = new Running([11, 106], 20, 120, 1000);
// console.log(run1, cycling1);
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Update some features
const modal = document.querySelector('.modal');
const closeModalBtn = document.querySelector('.modal__btn');
const overlay = document.querySelector('.overlay');
const removeAllBtn = document.querySelector('.remove-all');
const sort = document.querySelector('.sidebar__sort');
const sortInput = document.querySelector('.sidebar__sort--type');
/////////////////////////////////////////////
// Application
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markerGroup;
  #group = [];
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    //Update some features
    closeModalBtn.addEventListener('click', this._hideModal);
    overlay.addEventListener('click', this._hideModal);
    if (this.#workouts.length > 0) {
      removeAllBtn.classList.remove('hidden');
    }
    this._removeAll();
    this._sort();
    this._deleteWorkout();
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        this._showForm
      );
    }
  }

  _loadMap(position) {
    // Get current your location
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    // console.log(coords);

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    // Show marker when get data on local storage
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) => {
      return inputs.every(inp => Number.isFinite(inp));
    };
    const allPositive = (...inputs) => {
      return inputs.every(inp => inp > 0);
    };

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    const { lat, lng } = this.#mapEvent.latlng;

    // If activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        //   !Number.isFinite(distance) ||
        //   !Number.isFinite(duration) ||
        //   !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return this._showModal();
        // return alert('Inputs have to be positive numbers!');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        //   !Number.isFinite(distance) ||
        //   !Number.isFinite(duration) ||
        //   !Number.isFinite(cadence)
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) {
        return this._showModal();
        // return alert('Inputs have to be positive numbers!');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // console.log(workout);
    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on the map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on the list
    this._renderWorkout(workout);

    // Hide form + clear all input
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    // Update some new features
    //Show all workout
    this._showRemoveAllBtn();

    //Sort
    // this._sort();

    // Show toast when created success new workout
    this._toast(`You have successfully created a ${type} workout.`, 'success');
  }

  _renderWorkoutMarker(workout) {
    this.#markerGroup = L.layerGroup().addTo(this.#map);
    L.marker(workout.coords)
      .addTo(this.#markerGroup)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">
            ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}
          </span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <button class="workout__btn">❌</button>
      `;
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      `;
    }
    form.insertAdjacentHTML('afterend', html);

    // Update some features
    this._deleteWorkout();
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    if (this.#workouts.length === 0) return;
    const workout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 0.75,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  // Update some features
  // Modal
  _showModal() {
    modal.classList.add('active');
    overlay.classList.remove('hidden');
  }

  _hideModal() {
    modal.classList.remove('active');
    overlay.classList.add('hidden');
  }

  // Delete all activities
  _showRemoveAllBtn() {
    // Show remove btn
    if (this.#workouts.length > 0) {
      removeAllBtn.classList.remove('hidden');
    }
  }

  _removeAll() {
    const that = this;
    removeAllBtn.addEventListener('click', function () {
      that._toast('Successfully deleted all data.', 'success');
      removeAllBtn.classList.add('hidden');
      setTimeout(() => {
        localStorage.removeItem('workouts');
        location.reload();
      }, 2000);
    });
  }

  // Sort
  _deleteOriginalEl() {
    const liElements = containerWorkouts.querySelectorAll('li');
    liElements.forEach(liElement => {
      if (liElement.classList.contains('workout')) {
        liElement.remove();
      }
    });
  }

  _sort() {
    if (this.#workouts.length > 0) {
      sort.classList.remove('hidden');
    }
    form.addEventListener('submit', function () {
      sort.classList.remove('hidden');
    });
    let isEmpty;
    const that = this;
    const workouts = this.#workouts;
    sortInput.addEventListener('change', function (e) {
      if (e.target.value === 'running') {
        let runWorkout = workouts.filter(workout => workout.type === 'running');
        that._deleteOriginalEl();
        runWorkout.forEach(workout => {
          that._renderWorkout(workout);
        });
        isEmpty = runWorkout.length === 0 ? true : false;
      } else if (e.target.value === 'cycling') {
        const cycWorkout = workouts.filter(
          workout => workout.type === 'cycling'
        );
        that._deleteOriginalEl();
        cycWorkout.forEach(workout => {
          that._renderWorkout(workout);
        });
        isEmpty = cycWorkout.length === 0 ? true : false;
      } else if (e.target.value === 'all') {
        that._deleteOriginalEl();
        workouts.forEach(workout => {
          that._renderWorkout(workout);
        });
        isEmpty = workouts.length === 0 ? true : false;
      }

      if (isEmpty) {
        that._toast(
          `Perhaps the ${e.target.value} does not exist, so it cannot be filtered`,
          'error'
        );
      } else {
        that._toast(
          `You have successfully filtered by ${e.target.value}`,
          'success'
        );
      }
    });
  }

  // Toast
  _toast(message, type) {
    const icon = {
      success: 'fa-sharp fa-solid fa-circle-check',
      error: 'fa-solid fa-circle-exclamation',
    };
    const toastContainer = document.querySelector('.toast--container');
    const toast = document.createElement('div');
    toast.classList.add('toast', `toast--${type}`);
    toast.style.animation = `fadeIn 1s ease-in-out, fadeOut linear 1s 3s forwards`;
    toast.innerHTML = `
        <div class="toast__icon">
          <i class="${icon[type]}"></i>
        </div>
        <div class="toast__message">${message}</div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 4000);
  }

  // Delete workout element
  _deleteWorkout() {
    const that = this;
    const deleteWorkoutBtn = document.querySelector('.workout__btn');
    if (!deleteWorkoutBtn) return;
    deleteWorkoutBtn.addEventListener('click', function (e) {
      const workoutEl = e.target.closest('.workout');
      if (!workoutEl)
        that._toast(
          'Failed to delete the running workout. Please try again later!',
          'error'
        );
      that._toast(
        `Successfully deleted the ${workoutEl.type} workout!`,
        'success'
      );
      const findIndexElement = that.#workouts.findIndex(
        workout => workout.id === workoutEl.dataset.id
      );
      that.#workouts.splice(findIndexElement, 1);
      workoutEl.remove();
      that._setLocalStorage();
      // Remove marker
      location.reload();
    });
  }
}

const app = new App();
