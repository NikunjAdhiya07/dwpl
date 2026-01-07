/**
 * Convert a number to Indian Rupees in words
 * Example: 127772.00 -> "ONE Lakh TWENTY SEVEN Thousand SEVEN Hundred SEVENTY TWO Rupees And Zero Paise Only"
 */
export function numberToIndianWords(num: number): string {
  if (num === 0) return 'ZERO Rupees And Zero Paise Only';

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertLessThanThousand(remainder) : '');
  }

  function convertIndianNumber(n: number): string {
    if (n === 0) return '';

    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const remainder = n % 1000;

    let result = '';

    if (crore > 0) {
      result += convertLessThanThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
      result += convertLessThanThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      result += convertLessThanThousand(thousand) + ' Thousand ';
    }
    if (remainder > 0) {
      result += convertLessThanThousand(remainder);
    }

    return result.trim();
  }

  const rupeesInWords = convertIndianNumber(rupees);
  const paiseInWords = paise > 0 ? convertLessThanThousand(paise) : 'Zero';

  return `${rupeesInWords} Rupees And ${paiseInWords} Paise Only`;
}

/**
 * Format number with Indian comma notation
 * Example: 127772 -> "1,27,772.00"
 */
export function formatIndianCurrency(num: number): string {
  const [integer, decimal] = num.toFixed(2).split('.');
  
  // Indian numbering: last 3 digits, then groups of 2
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + 
                   (otherNumbers ? ',' : '') + lastThree;
  
  return formatted + '.' + decimal;
}
