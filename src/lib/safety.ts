/** India's single emergency number (police, fire, ambulance) */
const EMERGENCY_NUMBER = '112';

/** The Safety button on an active job: call emergency services. An in-app safety centre can replace this later. */
export const callEmergency = () => {
  window.location.href = `tel:${EMERGENCY_NUMBER}`;
};
