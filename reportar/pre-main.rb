require 'csv'
require 'pathname'
require 'open-uri'


DIR = File.dirname(File.expand_path(__FILE__))
INPUT_TXT_FILE = 'listado.txt'
INPUT_CSV_FILE = 'input.csv'
OUTPUT_CSV_FILE = 'output.csv'
OUTPUT_NO_MOODLE_FILE = 'nomoodle.csv'
OUTPUT_NO_SNFP_FILE = 'nosnfp.csv'
COMMON_NAMES_FILE = 'common-names.txt'

name_fixer = {}
File.readlines(COMMON_NAMES_FILE).each do |line|
  bad, good = line.split(' ')
  name_fixer[bad] = good
end

text = File.open(INPUT_TXT_FILE).read
text.gsub!(/\r\n?/, "\n")

first_row = true
diplomado_flag = false
cedula_to_full_name = {}

student_notes = {}
notes_header = []
total_mod = []
CSV.foreach(INPUT_CSV_FILE, {encoding: 'ISO-8859-1'}) do |row|
  full_name = "#{row[0]} #{row[1]}"
  cedula = row[2]
  notas = row[6..-1]


  if first_row
    notas.push("Observacion")
    diplomadocheck = notas.join(",")
    if diplomadocheck.include?("Total Mod")
      diplomado_flag = true
    end

    for i in 0..notas.length do
      if notas[i].to_s.include?("Total Mod")
        total_mod.push(i)
      end
    end

    notes_header = notas
    first_row = false
  else
    student_notes[cedula] = notas
    cedula_to_full_name[cedula] = full_name
    if !diplomado_flag 
       if notas[-2].to_i >= 60
          notas.push("C")
        else
          notas.push("NC")
        end
        puts "#{notas[-2]}"
    else
        if notas[-2] == '-'
          notas[-2] = 0
        end
        diplomado_observacion = false
        # puts "#{notas[-2]}"
        if notas[-2].to_i > 59
        for x in 0..total_mod.length do
          current = total_mod[x].to_i
          if notas[current] == '-'
            notas[current] = 0
          end
          # puts notas[total_mod[x].to_i]
          if notas[current].to_i < 80
            diplomado_observacion = true
          end
        end
      end


      if diplomado_observacion
        notas.push("Analizar")
      else
        notas.push("-")
      end


    end
  end
end

def valid?(s)
  special_characters = %w(? @ ! # $ % ^ & *)
  special_characters.each do |x|
    return nil if s.include?(x)
  end
  return true
end

# Returns Hash {full_name, cedula}
def find_student(text, number)
  found = false
  text_index = 0
  lines = 0

  break_all = false
  row = ''
  matricula = ''

  digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  text.each_line do |line|
    columns = line.split(" ").map! {|s| s.to_s}
    first_column = columns[0]
    cedula = columns[1]
    lines += 1

    next if !first_column

    first_column = first_column.split('')
    first_column = first_column.select {|s|  /^[A-Za-z0-9]+$/.match(s)}
    first_column = first_column.join('')
    found = true if first_column == number.to_s

    if found
      line.split('').each do |character|
        break_all = true if character == '('
        break if break_all
        row += character
      end

      start = false
      line.split('').each do |character|
        if character == '('
          start = true
          next
        end
        next if !start
        break if character == ')'
        matricula += character
      end

      break if break_all
    end
  end

  return nil if !found

  row.gsub!(/\n/, "")

  columns = row.split(" ")
  cedula = columns[1]
  nombre = columns[2..-1].join(" ")

  {full_name: nombre, cedula: cedula, matricula: matricula}
end

last_student = -1

	CSV.open(OUTPUT_CSV_FILE, "wb", {encoding: 'ISO-8859-1'}) do |csv|
	  csv << ["Nombre Completo", "Matricula"].concat(notes_header)

	  (1..200).each do |student_number|
	    # buscar student en snfp por txt
	    student_hash = find_student(text,student_number)
	    break if !student_hash
	    full_name, matricula, cedula = student_hash.values_at(:full_name, :matricula, :cedula)

	    # vamos a buscarlo en moodle
	    cedula_to_full_name[cedula] = full_name
	    notes = student_notes[cedula]
	    next if !notes

	    full_name = full_name.force_encoding('UTF-8')
	    full_name = full_name.split(' ').map do |n|
	      last_character = n.split('')[-1]
	      if last_character == ','
		new_name = n.split('')
		new_name.pop
		new_name = new_name.join
		name_fixer.key?(new_name) ? "#{name_fixer[new_name]}," : n
	      else
		name_fixer.key?(n) ? name_fixer[n] : n
	      end
	    end.join(' ')

	    if !valid?(full_name)
	      puts "==================================== #{full_name} TIENE CARACTERES ESPECIALES ===================================="
	    end

	    csv << [full_name, matricula].concat(notes)
	    puts "#{full_name} - #{cedula}"
	    last_student = student_number
	  end
	end



cedulas_csv = student_notes.keys
cedulas_pdf = (1..200).map do |student_number|
  student_hash = find_student(text, student_number)
  student_hash ? student_hash[:cedula] : nil
end.compact


unmatched_cedulas_csv = cedulas_csv - cedulas_pdf
CSV.open(OUTPUT_NO_SNFP_FILE, "w") do |csv|
  csv << ["Nombre Completo", "Cedula"]
  unmatched_cedulas_csv.each do |cedula|
    puts "#{cedula_to_full_name[cedula]} - #{cedula} esta en el Moodle pero no en SNFP"
    csv << [cedula_to_full_name[cedula], cedula]
  end
end


puts "========================================================================"

unmatched_cedulas_pdf = cedulas_pdf - cedulas_csv
CSV.open(OUTPUT_NO_MOODLE_FILE, "w") do |csv|
  csv << ["Nombre Completo", "Cedula"]
  unmatched_cedulas_pdf.each do |cedula|
    puts "#{cedula_to_full_name[cedula]} #{cedula} esta en el SNFP pero no en Moodle"
    csv << [cedula_to_full_name[cedula], cedula]
  end
end

puts "SE ENCONTRARON #{last_student} ESTUDIANTES"
