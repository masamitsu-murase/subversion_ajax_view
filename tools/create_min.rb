
require("fileutils")

def compress(files, output, temp_output)
  File.open(temp_output, "w") do |file|
    files.each do |input|
      File.open(input) do |f|
        file.write(f.read.gsub("\r\n", "\n"))
      end
    end
  end

  system("java -jar ~/my_program/yuicompressor-2.4.7/build/yuicompressor-2.4.7.jar #{temp_output} -o #{output}")
  FileUtils.rm(temp_output)
end

#############################################
path = "src/ajaxview/"

files = [ "libs/splitter.js", "dav_svn.js", "dav_svn_model.js", "repository_view.js" ].map{ |i| path + i }
output = "min/ajaxview/ajaxview.js"
temp_output = "min/ajaxview/ajaxview_temp.js"
compress(files, output, temp_output)

files = [ "src/svnindex.css" ] + [ "repository_view.css" ].map{ |i| path + i }
output = "min/ajaxview/ajaxview.css"
temp_output = "min/ajaxview/ajaxview_temp.css"
compress(files, output, temp_output)

