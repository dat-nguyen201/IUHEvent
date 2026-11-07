from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape


OUT = Path(__file__).resolve().parents[1] / "BAO_CAO_SO_BO_IUH_EVENT.docx"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def run(text, bold=False, color=None, size=None, italic=False):
    props = []
    if bold:
        props.append("<w:b/>")
    if italic:
        props.append("<w:i/>")
    if color:
        props.append(f'<w:color w:val="{color}"/>')
    if size:
        props.append(f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/>')
    rp = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
    return f'<w:r>{rp}<w:t xml:space="preserve">{escape(str(text))}</w:t></w:r>'


def para(text="", style=None, align=None, before=0, after=6, keep=False):
    ppr = []
    if style:
        ppr.append(f'<w:pStyle w:val="{style}"/>')
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    ppr.append(f'<w:spacing w:before="{before}" w:after="{after}" w:line="300" w:lineRule="auto"/>')
    if keep:
        ppr.append("<w:keepNext/>")
    return f'<w:p><w:pPr>{"".join(ppr)}</w:pPr>{text}</w:p>'


def ptext(text, **kwargs):
    return para(run(text), **kwargs)


def heading(text, level=1):
    return para(run(text), style=f"Heading{level}", before=220 if level == 1 else 140, after=90, keep=True)


def bullet(text):
    return para(run("•  ", bold=True, color="1877B9") + run(text), after=3)


def cell(text, header=False, width=4500):
    fill = "153A5B" if header else "F1F6FA"
    color = "FFFFFF" if header else "263746"
    return (f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/><w:shd w:fill="{fill}"/><w:tcMar>'
            '<w:top w:w="100" w:type="dxa"/><w:start w:w="130" w:type="dxa"/>'
            '<w:bottom w:w="100" w:type="dxa"/><w:end w:w="130" w:type="dxa"/>'
            f'</w:tcMar></w:tcPr>{para(run(text, bold=header, color=color, size=20), after=0)}</w:tc>')


def table(rows, widths=None):
    widths = widths or [4500] * len(rows[0])
    grid = "".join(f'<w:gridCol w:w="{n}"/>' for n in widths)
    trs = []
    for ri, row in enumerate(rows):
        trs.append("<w:tr>" + "".join(cell(value, ri == 0, widths[ci]) for ci, value in enumerate(row)) + "</w:tr>")
    borders = '<w:tblBorders><w:top w:val="single" w:sz="5" w:color="D7E2EB"/><w:left w:val="single" w:sz="5" w:color="D7E2EB"/><w:bottom w:val="single" w:sz="5" w:color="D7E2EB"/><w:right w:val="single" w:sz="5" w:color="D7E2EB"/><w:insideH w:val="single" w:sz="4" w:color="D7E2EB"/><w:insideV w:val="single" w:sz="4" w:color="D7E2EB"/></w:tblBorders>'
    return f'<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/>{borders}</w:tblPr><w:tblGrid>{grid}</w:tblGrid>{"".join(trs)}</w:tbl>' + para("", after=3)


def step(n, title, detail):
    return para(run(f"{n}. {title}  ", bold=True, color="153A5B") + run(detail), after=5)


body = []
# Cover
body.append(para(run("BÁO CÁO SƠ BỘ", bold=True, color="1877B9", size=30), align="center", before=1800, after=180))
body.append(para(run("IUH EVENT", bold=True, color="153A5B", size=54), align="center", after=120))
body.append(para(run("ĐỒNG HÀNH SỰ KIỆN SINH VIÊN", bold=True, color="3D5B73", size=27), align="center", after=500))
body.append(para(run("GIỚI THIỆU CHỨC NĂNG\nVÀ HƯỚNG DẪN SỬ DỤNG", bold=True, color="1877B9", size=25), align="center", after=520))
body.append(table([["Thông tin", "Nội dung"], ["Phiên bản tài liệu", "Báo cáo sơ bộ"], ["Phạm vi", "Ứng dụng IUH Event và các chức năng hiện có"], ["Công nghệ", "Ứng dụng di động Expo / React Native; API và MongoDB ở chế độ remote"]], [2600, 6400]))
body.append(para(run("Tài liệu phục vụ giới thiệu sản phẩm và hướng dẫn trình diễn các luồng chính.", italic=True, color="65798A", size=20), align="center", before=500, after=0))
body.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')

body += [heading("1. Tổng quan ứng dụng"),
         ptext("IUH Event hỗ trợ sinh viên theo dõi hoạt động tại IUH: tìm kiếm sự kiện, xem chi tiết, đăng ký tham gia, lưu vào lịch cá nhân, nhận nhắc lịch và check-in bằng QR. Tài khoản quản trị có màn hình tạo và quản lý sự kiện, đồng thời quản lý hồ sơ và trạng thái tài khoản sinh viên."),
         ptext("Ứng dụng có hai chế độ vận hành. Chế độ demo phù hợp xem giao diện và thử luồng cục bộ. Chế độ remote kết nối API của nhóm và cơ sở dữ liệu MongoDB để xác thực, đồng bộ dữ liệu nghiệp vụ."),
         heading("1.1 Luồng sử dụng chính", 2),
         table([["Bước", "Luồng sinh viên", "Luồng quản trị"],
                ["1", "Mở ứng dụng, đăng nhập hoặc đăng ký", "Đăng nhập bằng tài khoản admin remote"],
                ["2", "Vào Trang chủ, Khám phá sự kiện", "Mở Hồ sơ → Quản trị sự kiện IUH"],
                ["3", "Xem chi tiết, đăng ký và lưu sự kiện", "Tạo/sửa, đăng hoặc lưu trữ sự kiện"],
                ["4", "Theo dõi Lịch của tôi, đặt nhắc", "Tìm, xem, sửa hoặc khóa/mở tài khoản"],
                ["5", "Tham dự và check-in bằng QR", "Theo dõi dữ liệu sự kiện và người dùng"]], [700, 4300, 4000]),
         heading("2. Bắt đầu và đăng nhập"),
         step(1, "Khởi động ứng dụng", "Từ thư mục dự án, cài dependencies bằng npm install rồi chạy npx expo start."),
         step(2, "Chọn chế độ", "Demo dùng dữ liệu thử nghiệm trên thiết bị. Remote yêu cầu API server và MongoDB đang chạy; cấu hình EXPO_PUBLIC_APP_MODE=remote cùng EXPO_PUBLIC_API_URL trong .env rồi khởi động lại Expo."),
         step(3, "Đăng nhập hoặc đăng ký", "Chọn tab tương ứng trên màn xác thực. Đăng ký nhập họ tên, mã sinh viên, email và mật khẩu. Remote đăng nhập bằng email/mật khẩu; demo hiển thị thông tin tài khoản dùng thử ngay trên màn hình."),
         step(4, "Bắt đầu sử dụng", "Sau lần đăng nhập đầu, chọn Bắt đầu khám phá ở màn Get Started. Các lần sau, phiên còn hiệu lực sẽ được khôi phục theo chế độ đã cấu hình."),
         ptext("Khi dùng điện thoại thật để kết nối remote, EXPO_PUBLIC_API_URL phải dùng địa chỉ IP LAN của máy chạy server, ví dụ http://192.168.1.20:3000; không dùng localhost. Tài khoản demo chỉ để minh họa, không phải tài khoản sản xuất.", style="Note"),
         heading("3. Chức năng dành cho sinh viên")]

body += [heading("3.1 Trang chủ", 2),
         ptext("Trang chủ tổng hợp lời chào, sự kiện nổi bật/sắp diễn ra, danh mục, hoạt động cá nhân và lối tắt check-in."),
         bullet("Chạm sự kiện nổi bật hoặc một thẻ sự kiện để mở trang chi tiết."),
         bullet("Chọn ô tìm nhanh hoặc danh mục để chuyển sang Khám phá."),
         bullet("Chọn Quét mã QR Check-in để mở màn hình điểm danh."),
         bullet("Các chỉ số sự kiện đã lưu và lượt check-in là lối tắt đến lịch cá nhân."),
         heading("3.2 Khám phá sự kiện", 2),
         step(1, "Mở Khám phá", "Chọn tab Khám phá ở thanh điều hướng dưới màn hình."),
         step(2, "Tìm và lọc", "Nhập tên sự kiện hoặc địa điểm; chọn danh mục để thu hẹp kết quả. Xóa từ khóa để xem lại danh sách."),
         step(3, "Duyệt danh sách", "Cuộn xuống để tải thêm khi còn dữ liệu. Chọn Thử lại nếu tải lỗi; đổi từ khóa/danh mục nếu danh sách rỗng."),
         step(4, "Mở sự kiện", "Chạm vào thẻ để xem thời gian, địa điểm, đơn vị tổ chức, mô tả và các thao tác tham gia."),
         heading("3.3 Chi tiết và đăng ký sự kiện", 2),
         bullet("Chọn Đăng ký tham gia ngay để ghi danh. Nếu đã đăng ký, thao tác hủy đăng ký sẽ xuất hiện theo trạng thái."),
         bullet("Chọn Lưu vào lịch để theo dõi; chọn Bỏ lưu khỏi lịch để gỡ khỏi danh sách đã lưu."),
         bullet("Chọn Nhắc tôi khi sắp diễn ra để cấp quyền thông báo và đặt nhắc. Có thể hủy nhắc bằng nút tương ứng."),
         bullet("Chọn Quét mã QR Check-in để mở điểm danh cho sự kiện."),
         bullet("Mục Tóm tắt nhanh sử dụng thông tin công khai; cần đồng ý trước khi tạo. Khi dịch vụ AI chưa cấu hình hoặc gặp lỗi, ứng dụng có tóm tắt dự phòng demo."),
         heading("3.4 Lịch của tôi", 2),
         ptext("Lịch cá nhân nhóm dữ liệu theo Đã lưu, Đã đăng ký và Đã check-in; các sự kiện được phân biệt theo thời gian sắp tới/đã qua và trạng thái."),
         step(1, "Chọn nhóm", "Chọn tab trạng thái ở đầu màn hình để lọc sự kiện tương ứng."),
         step(2, "Mở chi tiết", "Chạm vào sự kiện trong danh sách để xem thông tin đầy đủ."),
         step(3, "Cập nhật trạng thái", "Dùng Hủy lưu hoặc Hủy đăng ký khi cần. Với sự kiện đã đăng ký, nút Quét QR mở luồng check-in."),
         heading("3.5 Check-in QR", 2),
         step(1, "Mở màn quét", "Từ Trang chủ, Lịch của tôi hoặc chi tiết sự kiện, chọn Quét mã QR Check-in."),
         step(2, "Cấp quyền camera", "Cho phép camera khi hệ điều hành hỏi. Có thể bật đèn pin hoặc đổi camera trước/sau."),
         step(3, "Quét mã", "Đưa QR sự kiện vào giữa khung quét; ứng dụng kiểm tra mã, đăng ký và trạng thái check-in rồi hiển thị kết quả."),
         step(4, "Dùng chế độ dự phòng", "Nếu không cấp quyền hoặc dùng Web, mở phần nhập thủ công, nhập Event ID (ví dụ event-1) hoặc chọn sự kiện demo."),
         ptext("Check-in yêu cầu sinh viên đăng ký sự kiện trước. QR cần chứa Event ID mà API nhận diện được. Nhập mã thủ công/sự kiện demo chỉ phục vụ thử nghiệm.", style="Note"),
         heading("3.6 Hồ sơ và giao diện", 2),
         bullet("Hồ sơ hiển thị danh tính, vai trò, email và số liệu hoạt động; chạm ảnh đại diện để chọn ảnh."),
         bullet("Trong mục Giao diện, chọn tùy chọn sáng/tối có sẵn."),
         bullet("Chọn Đăng xuất để kết thúc phiên và trở về màn hình đăng nhập.")]

body.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
body += [heading("4. Chức năng dành cho quản trị viên"),
         ptext("Quản trị chỉ dành cho tài khoản admin đang hoạt động trong remote mode. Từ Hồ sơ, chọn Quản trị sự kiện IUH. Quyền được kiểm tra ở server; giao diện không tự cấp quyền admin."),
         heading("4.1 Tạo và quản lý sự kiện", 2),
         table([["Trường bắt buộc (*)", "Cách nhập"],
                ["Tên, mô tả", "Nhập tiêu đề và nội dung sự kiện."],
                ["Danh mục", "Chọn một danh mục có sẵn."],
                ["Ngày và giờ bắt đầu", "Chạm trường ngày để mở lịch; chạm trường giờ để mở bộ chọn giờ."],
                ["Địa điểm, đơn vị tổ chức", "Nhập địa điểm và tên đơn vị tổ chức."],
                ["Sức chứa", "Nhập số nguyên trong giới hạn được chấp nhận."]], [2700, 6300]),
         ptext("Các trường nguồn tóm tắt, tên ảnh có sẵn và URL hình ảnh là tùy chọn. Nếu thiếu trường bắt buộc hoặc dữ liệu không hợp lệ, form hiển thị lỗi và không gửi yêu cầu tạo. Sự kiện mới được lưu ở trạng thái bản nháp."),
         step(1, "Tạo", "Chọn Thêm sự kiện, điền các trường bắt buộc và chọn Tạo bản nháp."),
         step(2, "Chỉnh sửa", "Tại danh sách, chọn Sửa để cập nhật thông tin."),
         step(3, "Công khai", "Chọn Đăng để công khai sự kiện; xác nhận thao tác khi được hỏi."),
         step(4, "Ẩn hoặc lưu trữ", "Hủy đăng đưa sự kiện về bản nháp. Lưu trữ dùng để ngừng hiển thị nhưng giữ lịch sử; sự kiện lưu trữ có thể khôi phục về nháp."),
         step(5, "Tìm và lọc", "Tìm theo tên/địa điểm, lọc theo trạng thái và dùng điều hướng trang để xem danh sách."),
         heading("4.2 Quản lý tài khoản sinh viên", 2),
         step(1, "Mở danh sách", "Trong trang quản trị sự kiện, chọn Quản lý sinh viên."),
         step(2, "Tìm tài khoản", "Tìm theo họ tên, email hoặc mã sinh viên; lọc trạng thái và chuyển trang nếu cần."),
         step(3, "Xem và sửa hồ sơ", "Chọn tài khoản để xem chi tiết; chọn Sửa hồ sơ để cập nhật họ tên, mã sinh viên hoặc ngành."),
         step(4, "Khóa hoặc mở", "Chọn Khóa/Mở và xác nhận. Tài khoản bị khóa không thể sử dụng các thao tác cần quyền hoạt động."),
         ptext("Admin không xem hoặc sửa mật khẩu. Việc xóa tài khoản/sự kiện được thực hiện bằng khóa hoặc lưu trữ để giữ dữ liệu lịch sử.", style="Note"),
         heading("5. Kịch bản trình diễn ngắn"),
         table([["Thứ tự", "Thao tác trình diễn", "Kết quả cần quan sát"],
                ["1", "Admin remote đăng nhập, tạo sự kiện đầy đủ", "Form chọn ngày/giờ, kiểm tra bắt buộc và tạo bản nháp"],
                ["2", "Admin đăng sự kiện", "Trạng thái chuyển sang đã đăng"],
                ["3", "Sinh viên đăng nhập, tìm và đăng ký", "Sự kiện mở được chi tiết và xuất hiện trong lịch đăng ký"],
                ["4", "Lưu sự kiện và đặt nhắc", "Sự kiện nằm trong lịch; hệ điều hành nhận quyền thông báo"],
                ["5", "Check-in bằng QR hoặc nhập mã thử", "Màn hình hiện kết quả và trạng thái check-in"],
                ["6", "Admin tìm và khóa/mở một tài khoản thử", "Hồ sơ/trạng thái được cập nhật theo phản hồi API"]], [700, 4600, 3700]),
         heading("6. Ghi chú vận hành"),
         bullet("Remote mode cần API server chạy và MongoDB kết nối; nếu API lỗi, kiểm tra URL, mạng LAN và trạng thái server rồi thử lại."),
         bullet("Camera và thông báo cần quyền từ hệ điều hành; kiểm tra các luồng này trên điện thoại thật."),
         bullet("Thông báo trên Web và một số môi trường mô phỏng có giới hạn. Dùng điện thoại để trình diễn chức năng thiết bị."),
         bullet("Tóm tắt sự kiện có thể chạy chế độ dự phòng nếu chưa thiết lập dịch vụ AI."),
         bullet("Thông tin đăng nhập dùng thử chỉ để phát triển/trình diễn; không dùng mật khẩu demo cho môi trường thật."),
         heading("7. Các khu vực mã nguồn liên quan", 2),
         table([["Khu vực", "Thư mục/tệp"],
                ["Màn hình sinh viên", "src/app/(tabs)/ và src/app/events/[id].tsx"],
                ["Xác thực và check-in", "src/app/auth.tsx, src/app/check-in.tsx"],
                ["Quản trị", "src/app/admin/ và src/app/admin-users.tsx"],
                ["Dịch vụ ứng dụng", "src/services/"],
                ["API và MongoDB", "server/src/; tài liệu contract ở docs/API_CONTRACT.md"]], [2700, 6300]),
         para(run("— Hết —", bold=True, color="1877B9", size=21), align="center", before=300, after=0)]

document_xml = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
 '<w:document xmlns:w="' + W + '" xmlns:r="' + R + '"><w:body>' + "".join(body) +
 '<w:sectPr><w:headerReference w:type="default" r:id="rId2"/><w:footerReference w:type="default" r:id="rId3"/>'
 '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="500" w:footer="500" w:gutter="0"/>'
 '</w:sectPr></w:body></w:document>')

styles_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{W}">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Aptos"/><w:sz w:val="21"/><w:color w:val="263746"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="300"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Aptos"/><w:sz w:val="21"/><w:color w:val="263746"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/><w:pBdr><w:bottom w:val="single" w:sz="10" w:space="5" w:color="1877B9"/></w:pBdr></w:pPr><w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:color w:val="153A5B"/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="1877B9"/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Note"><w:name w:val="Note"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="180" w:right="180"/><w:shd w:fill="EAF4FB"/><w:spacing w:before="80" w:after="100"/></w:pPr><w:rPr><w:color w:val="31536C"/><w:sz w:val="20"/></w:rPr></w:style>
</w:styles>'''

header_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="{W}"><w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="5" w:space="5" w:color="D7E2EB"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="1877B9"/><w:sz w:val="18"/></w:rPr><w:t>IUH EVENT</w:t></w:r><w:r><w:rPr><w:color w:val="65798A"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">  |  BÁO CÁO SƠ BỘ &amp; HƯỚNG DẪN SỬ DỤNG</w:t></w:r></w:p></w:hdr>'''
footer_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="{W}"><w:p><w:pPr><w:jc w:val="center"/><w:pBdr><w:top w:val="single" w:sz="5" w:space="5" w:color="D7E2EB"/></w:pBdr></w:pPr><w:r><w:rPr><w:color w:val="65798A"/><w:sz w:val="18"/></w:rPr><w:t>IUH Event  •  Trang </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>'''

rels = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>'''
root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'''
content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'''

OUT.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(OUT, "w", ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("_rels/.rels", root_rels)
    z.writestr("word/document.xml", document_xml)
    z.writestr("word/styles.xml", styles_xml)
    z.writestr("word/header1.xml", header_xml)
    z.writestr("word/footer1.xml", footer_xml)
    z.writestr("word/_rels/document.xml.rels", rels)
print(OUT)
