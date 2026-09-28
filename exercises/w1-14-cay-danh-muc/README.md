# w1-14 · Cây danh mục

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** biến danh sách phẳng thành cấu trúc cây lồng nhau, đi ngược từ nút con lên gốc.

Giống bảng `catalog_category_entity` của Magento: mỗi dòng chỉ biết `parent_id` của mình. Menu và breadcrumb phải dựng từ đó.

## So với PHP

- Object trong JS được truyền theo **tham chiếu**. Đặt cùng một object node vào `children` của cha thì sửa node ở đâu
  cũng thấy ở mọi chỗ. Đây là mẹo để dựng cây trong một lần duyệt. (Tuần 2 sẽ học kỹ về tham chiếu.)
- Một object dùng làm bảng tra `{ [id]: node }` giống mảng kết hợp `$map[$id] = $node` trong PHP.
  Khác biệt: mảng PHP gán là copy, còn object JS gán là tham chiếu.

## Dữ liệu

```js
const categories = [
  { id: 1, parentId: null, name: 'Default', position: 1 },
  { id: 2, parentId: 1, name: 'Men', position: 2 },
  { id: 3, parentId: 1, name: 'Women', position: 1 },
  { id: 4, parentId: 2, name: 'Shoes', position: 1 },
];
```

## Yêu cầu

### 1. `buildCategoryTree(categories)`

Trả về array các nút gốc (`parentId === null`). Mỗi nút có dạng `{ id, name, children }`, chỉ có đúng 3 key này.
`children` sắp theo `position` tăng dần, các nút gốc cũng vậy.

- Category có `parentId` trỏ tới id không tồn tại: bỏ qua nó (và vì thế cả con cháu của nó).
- Không sửa array/object đầu vào.

```js
buildCategoryTree(categories);
// [
//   { id: 1, name: 'Default', children: [
//       { id: 3, name: 'Women', children: [] },
//       { id: 2, name: 'Men', children: [ { id: 4, name: 'Shoes', children: [] } ] },
//   ] },
// ]
```

### 2. `getBreadcrumb(categories, id)`

Trả về array tên từ gốc tới category `id`. Không tìm thấy `id` thì trả `[]`.

```js
getBreadcrumb(categories, 4); // ['Default', 'Men', 'Shoes']
getBreadcrumb(categories, 1); // ['Default']
```

## Chạy

```bash
npm run check w1-14
```

## Tự kiểm tra sau khi đạt

Cách làm của bạn duyệt danh sách bao nhiêu lần? Nếu có 10.000 category thì cách "với mỗi nút, lọc lại cả danh sách để
tìm con" tốn khoảng bao nhiêu phép so sánh, so với cách dùng bảng tra theo id?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Lần duyệt 1: tạo node `{ id, name, children: [] }` cho mọi category, lưu vào bảng tra theo `id`.
Lần duyệt 2: với mỗi category, tìm node cha trong bảng tra rồi `push` node con vào `children` của cha.
Sắp xếp theo `position` trước khi dựng thì các `children` tự đúng thứ tự.
Breadcrumb: bắt đầu từ `id`, lặp `while` đi lên theo `parentId`, dùng `unshift` để thêm vào đầu array.

</details>
