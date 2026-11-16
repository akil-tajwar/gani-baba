export const locationData = {
    divisions: [
      { id: 'Dhaka', name: 'Dhaka' },
      { id: 'Chittagong', name: 'Chittagong' },
      { id: 'Rajshahi', name: 'Rajshahi' },
      { id: 'Khulna', name: 'Khulna' },
      { id: 'Barisal', name: 'Barisal' },
      { id: 'Sylhet', name: 'Sylhet' },
      { id: 'Rangpur', name: 'Rangpur' },
      { id: 'Mymensingh', name: 'Mymensingh' },
    ],
    districts: {
      Dhaka: [
        { id: 'Dhaka', name: 'Dhaka' },
        { id: 'Faridpur', name: 'Faridpur' },
        { id: 'Gazipur', name: 'Gazipur' },
        { id: 'Gopalganj', name: 'Gopalganj' },
        { id: 'Kishoreganj', name: 'Kishoreganj' },
        { id: 'Madaripur', name: 'Madaripur' },
        { id: 'Manikganj', name: 'Manikganj' },
        { id: 'Munshiganj', name: 'Munshiganj' },
        { id: 'Narayanganj', name: 'Narayanganj' },
        { id: 'Narsingdi', name: 'Narsingdi' },
        { id: 'Rajbari', name: 'Rajbari' },
        { id: 'Shariatpur', name: 'Shariatpur' },
        { id: 'Tangail', name: 'Tangail' },
      ],
      Chittagong: [
        { id: 'Bandarban', name: 'Bandarban' },
        { id: 'Brahmanbaria', name: 'Brahmanbaria' },
        { id: 'Chandpur', name: 'Chandpur' },
        { id: 'Chittagong', name: 'Chittagong' },
        { id: 'Comilla', name: 'Comilla' },
        { id: "Cox's Bazar", name: "Cox's Bazar" },
        { id: 'Feni', name: 'Feni' },
        { id: 'Khagrachhari', name: 'Khagrachhari' },
        { id: 'Lakshmipur', name: 'Lakshmipur' },
        { id: 'Noakhali', name: 'Noakhali' },
        { id: 'Rangamati', name: 'Rangamati' },
      ],
      Rajshahi: [
        { id: 'Bogra', name: 'Bogra' },
        { id: 'Joypurhat', name: 'Joypurhat' },
        { id: 'Naogaon', name: 'Naogaon' },
        { id: 'Natore', name: 'Natore' },
        { id: 'Chapainawabganj', name: 'Chapainawabganj' },
        { id: 'Pabna', name: 'Pabna' },
        { id: 'Rajshahi', name: 'Rajshahi' },
        { id: 'Sirajganj', name: 'Sirajganj' },
      ],
      Khulna: [
        { id: 'Bagerhat', name: 'Bagerhat' },
        { id: 'Chuadanga', name: 'Chuadanga' },
        { id: 'Jessore', name: 'Jessore' },
        { id: 'Jhenaidah', name: 'Jhenaidah' },
        { id: 'Khulna', name: 'Khulna' },
        { id: 'Kushtia', name: 'Kushtia' },
        { id: 'Magura', name: 'Magura' },
        { id: 'Meherpur', name: 'Meherpur' },
        { id: 'Narail', name: 'Narail' },
        { id: 'Satkhira', name: 'Satkhira' },
      ],
      Barisal: [
        { id: 'Barguna', name: 'Barguna' },
        { id: 'Barisal', name: 'Barisal' },
        { id: 'Bhola', name: 'Bhola' },
        { id: 'Jhalokati', name: 'Jhalokati' },
        { id: 'Patuakhali', name: 'Patuakhali' },
        { id: 'Pirojpur', name: 'Pirojpur' },
      ],
      Sylhet: [
        { id: 'Habiganj', name: 'Habiganj' },
        { id: 'Moulvibazar', name: 'Moulvibazar' },
        { id: 'Sunamganj', name: 'Sunamganj' },
        { id: 'Sylhet', name: 'Sylhet' },
      ],
      Rangpur: [
        { id: 'Dinajpur', name: 'Dinajpur' },
        { id: 'Gaibandha', name: 'Gaibandha' },
        { id: 'Kurigram', name: 'Kurigram' },
        { id: 'Lalmonirhat', name: 'Lalmonirhat' },
        { id: 'Nilphamari', name: 'Nilphamari' },
        { id: 'Panchagarh', name: 'Panchagarh' },
        { id: 'Rangpur', name: 'Rangpur' },
        { id: 'Thakurgaon', name: 'Thakurgaon' },
      ],
      Mymensingh: [
        { id: 'Jamalpur', name: 'Jamalpur' },
        { id: 'Mymensingh', name: 'Mymensingh' },
        { id: 'Netrokona', name: 'Netrokona' },
        { id: 'Sherpur', name: 'Sherpur' },
      ],
    },
  }

/**
 * SITE SETTINGS  —  replace the placeholder values below with the real ones.
 * Everything in the storefront (footer, navbar, checkout, WhatsApp button)
 * reads from this single object.
 */
export const siteConfig = {
  name: 'Gani Baba',
  tagline: 'Sanitary ware, taps, geysers & pumps — delivered across Bangladesh',
  phone: '01XXXXXXXXX', // TODO: replace with real phone number
  whatsapp: '8801XXXXXXXXX', // TODO: country code + number, no "+" or spaces
  email: 'support@example.com', // TODO: replace
  address: 'Shop address, Area, City, Bangladesh', // TODO: replace
  social: {
    facebook: '', // e.g. https://facebook.com/yourpage  (leave '' to hide)
    instagram: '',
    youtube: '',
  },
  /** Manual mobile-banking numbers shown at checkout (personal numbers). */
  payment: {
    bkash: '01XXXXXXXXX', // TODO
    nagad: '01XXXXXXXXX', // TODO
    rocket: '01XXXXXXXXX', // TODO
    /** Minimum advance (in Tk) customer should send to confirm the order. */
    advanceAmount: 100,
  },
}

/** Round a price for display, Bangladeshi Taka. */
export const formatTaka = (value: number) =>
  `৳${Math.round(value).toLocaleString('en-US')}`
