import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

// Registrar locale brasileiro
registerLocale('pt-BR', ptBR);

interface DateTimePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  showTimeSelect?: boolean;
  timeFormat?: string;
  timeIntervals?: number;
  dateFormat?: string;
  placeholderText?: string;
  className?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  isClearable?: boolean;
}

export default function DateTimePicker({
  selected,
  onChange,
  showTimeSelect = true,
  timeFormat = "HH:mm",
  timeIntervals = 15,
  dateFormat = "dd/MM/yyyy HH:mm",
  placeholderText = "Selecione data e hora",
  className = "",
  required = false,
  minDate,
  maxDate,
  isClearable = false,
}: DateTimePickerProps) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      showTimeSelect={showTimeSelect}
      timeFormat={timeFormat}
      timeIntervals={timeIntervals}
      timeCaption="Hora"
      dateFormat={dateFormat}
      locale="pt-BR"
      placeholderText={placeholderText}
      className={`w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] ${className}`}
      required={required}
      minDate={minDate}
      maxDate={maxDate}
      isClearable={isClearable}
      autoComplete="off"
    />
  );
}

// Componente apenas para data (sem hora)
export function DateOnlyPicker({
  selected,
  onChange,
  dateFormat = "dd/MM/yyyy",
  placeholderText = "Selecione a data",
  className = "",
  required = false,
  minDate,
  maxDate,
  isClearable = false,
}: Omit<DateTimePickerProps, 'showTimeSelect' | 'timeFormat' | 'timeIntervals'>) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      dateFormat={dateFormat}
      locale="pt-BR"
      placeholderText={placeholderText}
      className={`w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] ${className}`}
      required={required}
      minDate={minDate}
      maxDate={maxDate}
      isClearable={isClearable}
      autoComplete="off"
    />
  );
}
